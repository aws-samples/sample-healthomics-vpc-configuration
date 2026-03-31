// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Creates a VPC with DNS support, DNS hostnames, one public and one private subnet per AZ.
 * The CDK Vpc construct automatically attaches an Internet Gateway.
 * NAT gateway count is configurable via the `natGateways` property (defaults to 0).
 */
export function createVpc(
  scope: Construct,
  props: {
    cidr: string;
    azs: string[];
    projectName: string;
    environment: string;
    natGateways?: number;
  }
): {
  vpc: ec2.Vpc;
  privateSubnets: ec2.ISubnet[];
  publicSubnets: ec2.ISubnet[];
} {
  const vpc = new ec2.Vpc(scope, `${props.projectName}-${props.environment}-vpc`, {
    ipAddresses: ec2.IpAddresses.cidr(props.cidr),
    enableDnsSupport: true,
    enableDnsHostnames: true,
    availabilityZones: props.azs,
    natGateways: props.natGateways ?? 0,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: `${props.projectName}-${props.environment}-private`,
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 24,
        name: `${props.projectName}-${props.environment}-public`,
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ],
  });

  return {
    vpc,
    privateSubnets: vpc.privateSubnets,
    publicSubnets: vpc.publicSubnets,
  };
}
