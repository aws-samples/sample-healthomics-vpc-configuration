// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Creates a security group with least-privilege rules for HealthOmics workflow tasks.
 * - No inbound rules (deny all inbound by default)
 * - Outbound HTTPS (port 443) only to specified CIDR blocks
 */
export function createSecurityGroup(
  scope: Construct,
  props: {
    vpc: ec2.Vpc;
    outboundCidrs: string[];
    projectName: string;
    environment: string;
  }
): ec2.SecurityGroup {
  const sg = new ec2.SecurityGroup(scope, `${props.projectName}-${props.environment}-sg`, {
    vpc: props.vpc,
    description: `HealthOmics security group for ${props.projectName} (${props.environment})`,
    allowAllOutbound: false,
    securityGroupName: `${props.projectName}-${props.environment}-healthomics-sg`,
  });

  for (const cidr of props.outboundCidrs) {
    sg.addEgressRule(
      ec2.Peer.ipv4(cidr),
      ec2.Port.tcp(443),
      `Allow HTTPS outbound to ${cidr}`
    );
  }

  return sg;
}
