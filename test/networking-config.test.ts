// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit tests for HealthOmics networking configuration integration

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HealthOmicsVpc } from '../lib/healthomics-vpc';

const REGION = 'us-east-1';

function buildStack(props: Record<string, any> = {}) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { region: REGION } });
  new HealthOmicsVpc(stack, 'TestVpc', props);
  return Template.fromStack(stack);
}

describe('HealthOmics Networking Configuration', () => {
  it('should not create an Omics Configuration when networkingConfigurationName is not set', () => {
    const template = buildStack();
    const configs = template.findResources('AWS::Omics::Configuration');
    expect(Object.keys(configs).length).toBe(0);
  });

  it('should create an AWS::Omics::Configuration when networkingConfigurationName is set', () => {
    const template = buildStack({
      networkingConfigurationName: 'my-omics-vpc-config',
    });
    template.resourceCountIs('AWS::Omics::Configuration', 1);
    template.hasResourceProperties('AWS::Omics::Configuration', {
      Name: 'my-omics-vpc-config',
    });
  });

  it('should include VPC config with subnet and security group references', () => {
    const template = buildStack({
      networkingConfigurationName: 'my-omics-vpc-config',
    });
    template.hasResourceProperties('AWS::Omics::Configuration', {
      RunConfigurations: {
        VpcConfig: {
          SubnetIds: Match.anyValue(),
          SecurityGroupIds: Match.anyValue(),
        },
      },
    });
  });

  it('should output NetworkingConfigurationName when set', () => {
    const template = buildStack({
      networkingConfigurationName: 'my-omics-vpc-config',
    });
    const outputs = template.toJSON().Outputs;
    const outputKeys = Object.keys(outputs);
    expect(
      outputKeys.some((k) => k.includes('NetworkingConfigurationName'))
    ).toBe(true);
  });

  it('should output NetworkingConfigurationArn when set', () => {
    const template = buildStack({
      networkingConfigurationName: 'my-omics-vpc-config',
    });
    const outputs = template.toJSON().Outputs;
    const outputKeys = Object.keys(outputs);
    expect(
      outputKeys.some((k) => k.includes('NetworkingConfigurationArn'))
    ).toBe(true);
  });

  it('should have a DeletionPolicy of Delete', () => {
    const template = buildStack({
      networkingConfigurationName: 'test-config',
    });
    const configs = template.findResources('AWS::Omics::Configuration');
    const config = Object.values(configs)[0] as any;
    expect(config.DeletionPolicy).toBe('Delete');
  });
});
