// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 5: Production mode NAT-per-AZ with same-AZ routing
// Feature: healthomics-vpc, Property 6: Development mode single NAT Gateway
// Feature: healthomics-vpc, Property 4: Private subnet routing to NAT Gateway

import * as fc from 'fast-check';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { getNatGatewayCount } from '../lib/nat-gateway-builder';
import { HEALTHOMICS_REGION_MAP } from '../lib/constants';

/**
 * Generator that picks a random supported region and a random non-empty
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

// Feature: healthomics-vpc, Property 5: Production mode NAT-per-AZ with same-AZ routing
// **Validates: Requirements 4.1, 4.2, 4.5**
describe('Property 5: Production mode NAT-per-AZ with same-AZ routing', () => {
  it('should deploy one NAT Gateway per AZ, each in a public subnet', () => {
    fc.assert(
      fc.property(regionAndAzSubsetArb, ({ region, azs }) => {
        const natCount = getNatGatewayCount('production', azs.length);

        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', { env: { region } });

        createVpc(stack, {
          cidr: '10.0.0.0/16',
          azs,
          projectName: 'test',
          environment: 'prod',
          natGateways: natCount,
        });

        const template = Template.fromStack(stack);

        // NAT Gateway count should equal AZ count in production mode
        const natGateways = template.findResources('AWS::EC2::NatGateway');
        const natGatewayEntries = Object.values(natGateways);
        expect(natGatewayEntries.length).toBe(azs.length);

        // Identify public subnet logical IDs (MapPublicIpOnLaunch = true)
        const subnets = template.findResources('AWS::EC2::Subnet');
        const publicSubnetLogicalIds = Object.keys(subnets).filter(
          (id) => subnets[id].Properties.MapPublicIpOnLaunch === true
        );

        // Each NAT Gateway must be in a public subnet
        for (const natGw of natGatewayEntries) {
          const subnetRef = (natGw as any).Properties.SubnetId?.Ref;
          expect(publicSubnetLogicalIds).toContain(subnetRef);
        }
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: healthomics-vpc, Property 6: Development mode single NAT Gateway
// **Validates: Requirements 4.3, 4.4**
describe('Property 6: Development mode single NAT Gateway', () => {
  it('should deploy exactly one NAT Gateway in development mode regardless of AZ count', () => {
    fc.assert(
      fc.property(regionAndAzSubsetArb, ({ region, azs }) => {
        const natCount = getNatGatewayCount('development', azs.length);

        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', { env: { region } });

        createVpc(stack, {
          cidr: '10.0.0.0/16',
          azs,
          projectName: 'test',
          environment: 'dev',
          natGateways: natCount,
        });

        const template = Template.fromStack(stack);

        // Exactly one NAT Gateway in development mode
        const natGateways = template.findResources('AWS::EC2::NatGateway');
        const natGatewayEntries = Object.values(natGateways);
        expect(natGatewayEntries.length).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: healthomics-vpc, Property 4: Private subnet routing to NAT Gateway
// **Validates: Requirements 3.2**
describe('Property 4: Private subnet routing to NAT Gateway', () => {
  it('should route every private subnet 0.0.0.0/0 traffic to a NAT Gateway', () => {
    fc.assert(
      fc.property(
        regionAndAzSubsetArb,
        fc.constantFrom('production' as const, 'development' as const),
        ({ region, azs }, mode) => {
          const natCount = getNatGatewayCount(mode, azs.length);

          const app = new cdk.App();
          const stack = new cdk.Stack(app, 'TestStack', { env: { region } });

          createVpc(stack, {
            cidr: '10.0.0.0/16',
            azs,
            projectName: 'test',
            environment: 'dev',
            natGateways: natCount,
          });

          const template = Template.fromStack(stack);

          // Identify private subnet logical IDs (MapPublicIpOnLaunch is NOT true)
          const subnets = template.findResources('AWS::EC2::Subnet');
          const privateSubnetLogicalIds = Object.keys(subnets).filter(
            (id) => subnets[id].Properties.MapPublicIpOnLaunch !== true
          );

          // Find route table associations for private subnets
          const rtAssociations = template.findResources(
            'AWS::EC2::SubnetRouteTableAssociation'
          );
          const privateRouteTableIds = new Set<string>();
          for (const assoc of Object.values(rtAssociations)) {
            const subnetRef = (assoc as any).Properties.SubnetId?.Ref;
            if (subnetRef && privateSubnetLogicalIds.includes(subnetRef)) {
              const rtRef = (assoc as any).Properties.RouteTableId?.Ref;
              if (rtRef) {
                privateRouteTableIds.add(rtRef);
              }
            }
          }

          // Each private route table must have a 0.0.0.0/0 route targeting a NAT Gateway
          const routes = template.findResources('AWS::EC2::Route');

          expect(privateRouteTableIds.size).toBeGreaterThanOrEqual(1);

          for (const rtId of privateRouteTableIds) {
            const matchingRoutes = Object.values(routes).filter((r: any) => {
              const routeTableRef = r.Properties.RouteTableId?.Ref;
              const destination = r.Properties.DestinationCidrBlock;
              const natGwRef = r.Properties.NatGatewayId?.Ref;
              return (
                routeTableRef === rtId &&
                destination === '0.0.0.0/0' &&
                natGwRef !== undefined
              );
            });

            expect(matchingRoutes.length).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
