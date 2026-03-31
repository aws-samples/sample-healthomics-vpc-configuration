// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Creates a HealthOmics networking configuration using an AwsSdkCall custom resource.
 * This registers the VPC subnets and security group with HealthOmics so runs can
 * use `--networking-mode VPC --configuration-name <name>`.
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
  const subnetIds = props.privateSubnets.map((s) => s.subnetId);
  const securityGroupIds = [props.securityGroup.securityGroupId];

  const createCall: cr.AwsSdkCall = {
    service: 'Omics',
    action: 'createConfiguration',
    parameters: {
      name: props.configurationName,
      runConfigurations: {
        vpcConfig: {
          subnetIds,
          securityGroupIds,
        },
      },
    },
    physicalResourceId: cr.PhysicalResourceId.fromResponse('arn'),
  };

  const deleteCall: cr.AwsSdkCall = {
    service: 'Omics',
    action: 'deleteConfiguration',
    parameters: {
      name: props.configurationName,
    },
    ignoreErrorCodesMatching: 'ResourceNotFoundException|ConflictException|404|not found',
  };

  const resource = new cr.AwsCustomResource(
    scope,
    `${props.projectName}-${props.environment}-networking-config`,
    {
      onCreate: createCall,
      onDelete: deleteCall,
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'omics:CreateConfiguration',
            'omics:DeleteConfiguration',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: [
            'ec2:DescribeSubnets',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeVpcs',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          actions: ['iam:CreateServiceLinkedRole'],
          resources: ['arn:aws:iam::*:role/aws-service-role/omics.amazonaws.com/*'],
        }),
      ]),
    }
  );

  const configurationArn = resource.getResponseField('arn');
  return {
    configurationName: props.configurationName,
    configurationArn,
  };
}
