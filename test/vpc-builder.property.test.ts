// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 1: Subnet-per-AZ correspondence
// **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

import * as fc from 'fast-check';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { validateRegion } from '../lib/region-validator';
import { HEALTHOMICS_REGION_MAP } from '../lib/constants';

/**
 * Generator that picks a random supported region and then a random non-empty
 * subset of its valid HealthOmics AZs.
 */
const regionAndAzSubsetArb = fc
  .constantFrom(...Object.keys(HEALTHOMICS_REGION_MAP))
  .chain((region) => {
    const allAzs = HEALTHOMICS_REGION_MAP[region].azs;
    return fc
      .subarray(allAzs, { minLength: 1 })
      .map((azSubset) => ({ region, azs: azSubset }));
  });

describe('Property 1: Subnet-per-AZ correspondence', () => {
  it('should create exactly one private and one public subnet per AZ, and no subnets in other AZs', () => {
    fc.assert(
      fc.property(regionAndAzSubsetArb, ({ region, azs }) => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { region },
        });

        createVpc(stack, {
          cidr: '10.0.0.0/16',
          azs,
          projectName: 'test',
          environment: 'dev',
        });

        const template = Template.fromStack(stack);
        const subnets = template.findResources('AWS::EC2::Subnet');
        const subnetEntries = Object.values(subnets);

        // Total subnet count should be 2 * number of AZs (one private + one public per AZ)
        expect(subnetEntries.length).toBe(2 * azs.length);

        // Collect AZs from all subnets in the template
        const subnetAzs = subnetEntries.map(
          (s: any) => s.Properties.AvailabilityZone
        );

        // Each requested AZ should appear exactly twice (one private, one public)
        for (const az of azs) {
          const count = subnetAzs.filter((a: string) => a === az).length;
          expect(count).toBe(2);
        }

        // No subnets should exist in AZs outside the requested set
        for (const subnetAz of subnetAzs) {
          expect(azs).toContain(subnetAz);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: healthomics-vpc, Property 2: Default AZ selection uses all region AZs
// **Validates: Requirements 2.6**

describe('Property 2: Default AZ selection uses all region AZs', () => {
  it('should create subnets in all HealthOmics AZs when no AZ override is provided', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(HEALTHOMICS_REGION_MAP)),
        (region) => {
          // Use validateRegion with no AZ override to get all default AZs
          const defaultAzs: string[] = validateRegion(region);

          const expectedAzs = HEALTHOMICS_REGION_MAP[region].azs;

          // validateRegion should return all AZs for the region
          expect(defaultAzs).toEqual(expectedAzs);

          const app = new cdk.App();
          const stack = new cdk.Stack(app, 'TestStack', {
            env: { region },
          });

          createVpc(stack, {
            cidr: '10.0.0.0/16',
            azs: defaultAzs,
            projectName: 'test',
            environment: 'dev',
          });

          const template = Template.fromStack(stack);
          const subnets = template.findResources('AWS::EC2::Subnet');
          const subnetEntries = Object.values(subnets);

          // Collect AZs from all subnets in the template
          const subnetAzs = subnetEntries.map(
            (s: any) => s.Properties.AvailabilityZone
          );

          // Every HealthOmics AZ for the region should have subnets
          for (const az of expectedAzs) {
            const count = subnetAzs.filter((a: string) => a === az).length;
            expect(count).toBe(2); // one private + one public
          }

          // Total subnet count should match 2 * all region AZs
          expect(subnetEntries.length).toBe(2 * expectedAzs.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: healthomics-vpc, Property 3: Public subnet routing to Internet Gateway
// **Validates: Requirements 3.1**

describe('Property 3: Public subnet routing to Internet Gateway', () => {
  it('should have a 0.0.0.0/0 route to the IGW for every public subnet route table', () => {
    fc.assert(
      fc.property(regionAndAzSubsetArb, ({ region, azs }) => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
          env: { region },
        });

        createVpc(stack, {
          cidr: '10.0.0.0/16',
          azs,
          projectName: 'test',
          environment: 'dev',
        });

        const template = Template.fromStack(stack);

        // Find the Internet Gateway
        const igws = template.findResources('AWS::EC2::InternetGateway');
        const igwLogicalIds = Object.keys(igws);
        expect(igwLogicalIds.length).toBe(1);
        const igwLogicalId = igwLogicalIds[0];

        // Find all route resources
        const routes = template.findResources('AWS::EC2::Route');

        // Find all public subnet route tables
        // Public subnets are identified by MapPublicIpOnLaunch = true
        const subnets = template.findResources('AWS::EC2::Subnet');
        const publicSubnetLogicalIds = Object.keys(subnets).filter(
          (id) => subnets[id].Properties.MapPublicIpOnLaunch === true
        );

        // Find route table associations for public subnets
        const rtAssociations = template.findResources(
          'AWS::EC2::SubnetRouteTableAssociation'
        );
        const publicRouteTableIds = new Set<string>();
        for (const assoc of Object.values(rtAssociations)) {
          const subnetRef = (assoc as any).Properties.SubnetId?.Ref;
          if (subnetRef && publicSubnetLogicalIds.includes(subnetRef)) {
            const rtRef = (assoc as any).Properties.RouteTableId?.Ref;
            if (rtRef) {
              publicRouteTableIds.add(rtRef);
            }
          }
        }

        // Each public route table must have a 0.0.0.0/0 route targeting the IGW
        expect(publicRouteTableIds.size).toBeGreaterThanOrEqual(1);

        for (const rtId of publicRouteTableIds) {
          // Find routes associated with this route table that have 0.0.0.0/0 destination
          const matchingRoutes = Object.values(routes).filter((r: any) => {
            const routeTableRef = r.Properties.RouteTableId?.Ref;
            const destination = r.Properties.DestinationCidrBlock;
            const gatewayRef = r.Properties.GatewayId?.Ref;
            return (
              routeTableRef === rtId &&
              destination === '0.0.0.0/0' &&
              gatewayRef === igwLogicalId
            );
          });

          expect(matchingRoutes.length).toBe(1);
        }

        // Number of public route tables should equal number of AZs
        expect(publicRouteTableIds.size).toBe(azs.length);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: healthomics-vpc, Property 14: CIDR block passthrough
// **Validates: Requirements 1.2**

describe('Property 14: CIDR block passthrough', () => {
  /**
   * Generator that produces valid, network-aligned CIDR blocks with prefix
   * lengths /16 to /24. Host bits are properly zeroed so CDK won't normalise
   * the address (e.g. 172.16.1.0/16 would be invalid because the third octet
   * has bits set outside the /16 mask).
   */
  // Prefix must be /16–/22 so the VPC has room for at least two /24 subnets
  const validCidrArb = fc.integer({ min: 16, max: 22 }).chain((prefix) => {
    // Build a random 32-bit IP, then zero out the host portion
    return fc.integer({ min: 0, max: 0xFFFFFFFF }).map((raw) => {
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const network = (raw & mask) >>> 0;
      // Force into private range 10.x.x.x by setting first octet to 10
      const o1 = 10;
      const o2 = (network >> 16) & 0xFF;
      const o3 = (network >> 8) & 0xFF;
      const o4 = network & 0xFF;
      // Re-apply mask to ensure host bits are zero after forcing first octet
      const ip = ((o1 << 24) | (o2 << 16) | (o3 << 8) | o4) >>> 0;
      const masked = (ip & mask) >>> 0;
      const a = (masked >>> 24) & 0xFF;
      const b = (masked >>> 16) & 0xFF;
      const c = (masked >>> 8) & 0xFF;
      const d = masked & 0xFF;
      return `${a}.${b}.${c}.${d}/${prefix}`;
    });
  });

  it('should use the exact CIDR block provided in props for the synthesized VPC', () => {
    fc.assert(
      fc.property(
        validCidrArb,
        fc.constantFrom(...Object.keys(HEALTHOMICS_REGION_MAP)),
        (cidr, region) => {
          const azs = [HEALTHOMICS_REGION_MAP[region].azs[0]]; // Use single AZ to keep it simple
          const app = new cdk.App();
          const stack = new cdk.Stack(app, 'TestStack', {
            env: { region },
          });

          createVpc(stack, {
            cidr,
            azs,
            projectName: 'test',
            environment: 'dev',
          });

          const template = Template.fromStack(stack);
          const vpcs = template.findResources('AWS::EC2::VPC');
          const vpcEntries = Object.values(vpcs);

          // Exactly one VPC should be created
          expect(vpcEntries.length).toBe(1);

          // The VPC should use the exact CIDR block we provided
          expect((vpcEntries[0] as any).Properties.CidrBlock).toBe(cidr);
        }
      ),
      { numRuns: 100 }
    );
  });
});
