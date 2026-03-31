// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 8: Custom VPC endpoint list

import * as fc from 'fast-check';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { createSecurityGroup } from '../lib/security-group-builder';
import { createVpcEndpoints } from '../lib/endpoint-builder';
import { DEFAULT_VPC_ENDPOINTS } from '../lib/constants';

const REGION = 'us-east-1';
const AZS = ['us-east-1a', 'us-east-1b'];

/**
 * Generator for random non-empty subsets of DEFAULT_VPC_ENDPOINTS.
 */
const endpointSubsetArb = fc
  .subarray(DEFAULT_VPC_ENDPOINTS, { minLength: 1 })
  .filter((arr) => arr.length > 0);

function buildStackWithEndpoints(services: string[]) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { region: REGION } });

  const { vpc, privateSubnets } = createVpc(stack, {
    cidr: '10.0.0.0/16',
    azs: AZS,
    projectName: 'test',
    environment: 'dev',
    natGateways: 1,
  });

  const sg = createSecurityGroup(stack, {
    vpc,
    outboundCidrs: ['0.0.0.0/0'],
    projectName: 'test',
    environment: 'dev',
  });

  createVpcEndpoints(stack, {
    vpc,
    privateSubnets,
    securityGroup: sg,
    endpointServices: services,
    region: REGION,
  });

  return Template.fromStack(stack);
}

// **Validates: Requirements 6.1**
describe('Property 8: Custom VPC endpoint list', () => {
  it('should create VPC endpoints only for the specified services', () => {
    fc.assert(
      fc.property(endpointSubsetArb, (services) => {
        const template = buildStackWithEndpoints(services);

        const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
          Properties: { VpcEndpointType: 'Gateway' },
        });
        const interfaceEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
          Properties: { VpcEndpointType: 'Interface' },
        });

        const gatewayCount = Object.keys(gatewayEndpoints).length;
        const interfaceCount = Object.keys(interfaceEndpoints).length;

        const expectedGateway = services.includes('s3') ? 1 : 0;
        const expectedInterface = services.filter((s) => s !== 's3').length;

        expect(gatewayCount).toBe(expectedGateway);
        expect(interfaceCount).toBe(expectedInterface);
        expect(gatewayCount + interfaceCount).toBe(services.length);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: healthomics-vpc, Property 9: Interface endpoint placement and security group association

/**
 * Generator for random non-empty subsets of interface endpoints (non-s3 services).
 */
const interfaceServicesArb = fc
  .subarray(
    DEFAULT_VPC_ENDPOINTS.filter((s) => s !== 's3'),
    { minLength: 1 }
  )
  .filter((arr) => arr.length > 0);

// **Validates: Requirements 6.4, 6.5**
describe('Property 9: Interface endpoint placement and security group association', () => {
  it('should place each interface endpoint in all private subnets and associate with the security group', () => {
    fc.assert(
      fc.property(interfaceServicesArb, (services) => {
        const template = buildStackWithEndpoints(services);

        const interfaceEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
          Properties: { VpcEndpointType: 'Interface' },
        });

        const entries = Object.values(interfaceEndpoints);
        expect(entries.length).toBe(services.length);

        for (const ep of entries) {
          const props = (ep as any).Properties;

          // Each interface endpoint should be placed in all private subnets (2 AZs = 2 subnets)
          const subnetIds: any[] = props.SubnetIds ?? [];
          expect(subnetIds.length).toBe(AZS.length);

          // Each interface endpoint should be associated with the security group
          const sgIds: any[] = props.SecurityGroupIds ?? [];
          expect(sgIds.length).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });
});
