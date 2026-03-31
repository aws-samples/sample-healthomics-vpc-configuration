// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit tests for EndpointBuilder
// Requirements: 6.2, 6.3, 6.6

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { createSecurityGroup } from '../lib/security-group-builder';
import { createVpcEndpoints } from '../lib/endpoint-builder';
import { DEFAULT_VPC_ENDPOINTS } from '../lib/constants';

const REGION = 'us-east-1';
const AZS = ['us-east-1a', 'us-east-1b'];

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

describe('EndpointBuilder', () => {
  // Requirement 6.2: default 5 endpoints created (1 gateway + 4 interface = 5 total)
  it('should create 5 VPC endpoints when using DEFAULT_VPC_ENDPOINTS', () => {
    const template = buildStackWithEndpoints(DEFAULT_VPC_ENDPOINTS);

    const allEndpoints = template.findResources('AWS::EC2::VPCEndpoint');
    expect(Object.keys(allEndpoints).length).toBe(5);

    const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Gateway' },
    });
    expect(Object.keys(gatewayEndpoints).length).toBe(1);

    const interfaceEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Interface' },
    });
    expect(Object.keys(interfaceEndpoints).length).toBe(4);
  });

  // Requirement 6.3: S3 gateway endpoint is of type Gateway
  it('should create S3 endpoint as Gateway type', () => {
    const template = buildStackWithEndpoints(['s3']);

    const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
      Properties: { VpcEndpointType: 'Gateway' },
    });
    const entries = Object.values(gatewayEndpoints);
    expect(entries.length).toBe(1);

    const serviceName = (entries[0] as any).Properties.ServiceName;
    // The service name should reference the S3 service
    // CDK resolves this as a Fn::Join with the region, e.g. com.amazonaws.us-east-1.s3
    expect(JSON.stringify(serviceName)).toContain('s3');
  });

  // Requirement 6.6: no endpoints created when endpointServices is empty
  it('should create no endpoints when endpointServices is empty', () => {
    const template = buildStackWithEndpoints([]);

    const allEndpoints = template.findResources('AWS::EC2::VPCEndpoint');
    expect(Object.keys(allEndpoints).length).toBe(0);
  });
});
