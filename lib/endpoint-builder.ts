// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Creates VPC endpoints for AWS services used by HealthOmics workflows.
 * - S3 uses a gateway endpoint (free, associated with private subnet route tables)
 * - All other services use interface endpoints (placed in private subnets, associated with security group)
 */
export function createVpcEndpoints(
  scope: Construct,
  props: {
    vpc: ec2.Vpc;
    privateSubnets: ec2.ISubnet[];
    securityGroup: ec2.SecurityGroup;
    endpointServices: string[];
    region: string;
  }
): void {
  for (const service of props.endpointServices) {
    if (service === 's3') {
      new ec2.GatewayVpcEndpoint(scope, 'S3GatewayEndpoint', {
        vpc: props.vpc,
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnets: props.privateSubnets }],
      });
    } else {
      const endpointId = `${service.replace(/\./g, '-')}-endpoint`;
      new ec2.InterfaceVpcEndpoint(scope, endpointId, {
        vpc: props.vpc,
        service: new ec2.InterfaceVpcEndpointService(
          `com.amazonaws.${props.region}.${service}`
        ),
        subnets: { subnets: props.privateSubnets },
        securityGroups: [props.securityGroup],
        privateDnsEnabled: true,
      });
    }
  }
}
