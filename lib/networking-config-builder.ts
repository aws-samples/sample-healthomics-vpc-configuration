// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import * as omics from 'aws-cdk-lib/aws-omics';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Creates a HealthOmics networking configuration using the native
 * AWS::Omics::Configuration CloudFormation resource.
 *
 * Returns the configuration name and ARN.
 */
export function createNetworkingConfiguration(
  scope: Construct,
  props: {
    configurationName: string;
    privateSubnets: ec2.ISubnet[];
    securityGroup: ec2.SecurityGroup;
    projectName: string;
    environment: string;
  }
): { configurationName: string; configurationArn: string } {
  const config = new omics.CfnConfiguration(
    scope,
    `${props.projectName}-${props.environment}-networking-config`,
    {
      name: props.configurationName,
      runConfigurations: {
        vpcConfig: {
          subnetIds: props.privateSubnets.map((s) => s.subnetId),
          securityGroupIds: [props.securityGroup.securityGroupId],
        },
      },
    }
  );

  config.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

  return {
    configurationName: props.configurationName,
    configurationArn: config.attrArn,
  };
}
