// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit tests for HealthOmicsVpc integration
// Requirements: 1.1, 1.3, 1.4, 2.3, 4.4, 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.4

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HealthOmicsVpc } from '../lib/healthomics-vpc';

const REGION = 'us-east-1';

function buildStack(props: Record<string, any> = {}) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { region: REGION } });
  new HealthOmicsVpc(stack, 'TestVpc', props);
  return Template.fromStack(stack);
}

describe('HealthOmicsVpc integration', () => {
  // Requirement 1.1: VPC with DNS support and hostnames enabled
  it('should create VPC with DNS support and hostnames enabled', () => {
    const template = buildStack();
    template.hasResourceProperties('AWS::EC2::VPC', {
      EnableDnsSupport: true,
      EnableDnsHostnames: true,
    });
  });

  // Requirement 1.3: Default CIDR is 10.0.0.0/16
  it('should use default CIDR 10.0.0.0/16', () => {
    const template = buildStack();
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  // Requirement 1.4: Internet Gateway attached
  it('should attach an Internet Gateway to the VPC', () => {
    const template = buildStack();
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
  });

  // Requirement 4.4: Default deployment mode is development with 1 NAT
  it('should default to development mode with 1 NAT gateway', () => {
    const template = buildStack();
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  // Requirements 7.1, 7.3: Flow Logs enabled by default targeting CloudWatch
  it('should enable Flow Logs by default', () => {
    const template = buildStack();
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      ResourceType: 'VPC',
      TrafficType: 'ALL',
      LogDestinationType: 'cloud-watch-logs',
    });
  });

  // Requirement 7.2: Flow Logs skipped when disabled
  it('should skip Flow Logs when disabled', () => {
    const template = buildStack({ enableFlowLogs: false });
    const flowLogs = template.findResources('AWS::EC2::FlowLog');
    expect(Object.keys(flowLogs).length).toBe(0);
  });

  // Requirements 9.1, 9.2, 9.3, 9.4: Stack outputs
  it('should output VPC ID, Private Subnet IDs, Security Group ID, and Availability Zones', () => {
    const template = buildStack();
    const outputs = template.toJSON().Outputs;
    const outputKeys = Object.keys(outputs);

    expect(outputKeys.some((k) => k.startsWith('TestVpcVpcId'))).toBe(true);
    expect(outputKeys.some((k) => k.startsWith('TestVpcPrivateSubnetIds'))).toBe(true);
    expect(outputKeys.some((k) => k.startsWith('TestVpcSecurityGroupId'))).toBe(true);
    expect(outputKeys.some((k) => k.startsWith('TestVpcAvailabilityZones'))).toBe(true);
  });

  // Requirement 2.3: Private subnet count never exceeds 16
  it('should not create more than 16 private subnets', () => {
    const template = buildStack();
    const subnets = template.findResources('AWS::EC2::Subnet');
    const privateSubnets = Object.values(subnets).filter(
      (s: any) => s.Properties.MapPublicIpOnLaunch !== true
    );
    expect(privateSubnets.length).toBeLessThanOrEqual(16);
  });
});
