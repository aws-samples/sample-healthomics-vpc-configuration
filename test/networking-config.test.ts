// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit tests for HealthOmics networking configuration integration

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

describe('HealthOmics Networking Configuration', () => {
  it('should not create a custom resource when networkingConfigurationName is not set', () => {
    const template = buildStack();
    const customResources = template.findResources('Custom::AWS');
    expect(Object.keys(customResources).length).toBe(0);
  });

  it('should create a custom resource when networkingConfigurationName is set', () => {
    const template = buildStack({
      networkingConfigurationName: 'my-omics-vpc-config',
    });
    const customResources = template.findResources('Custom::AWS');
    expect(Object.keys(customResources).length).toBeGreaterThanOrEqual(1);

    // Verify the custom resource references the Omics service
    const crEntries = Object.values(customResources);
    const hasOmicsCall = crEntries.some((cr: any) => {
      const props = cr.Properties ?? {};
      const propsStr = JSON.stringify(props);
      return (
        propsStr.includes('Omics') &&
        propsStr.includes('createConfiguration')
      );
    });
    expect(hasOmicsCall).toBe(true);
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

  it('should include an IAM policy for omics networking configuration actions', () => {
    const template = buildStack({
      networkingConfigurationName: 'test-config',
    });
    // The AwsCustomResource creates an IAM policy with the required actions
    const policies = template.findResources('AWS::IAM::Policy');
    const policyEntries = Object.values(policies);
    const hasOmicsPolicy = policyEntries.some((p: any) => {
      const statements = p.Properties?.PolicyDocument?.Statement;
      if (!Array.isArray(statements)) return false;
      return statements.some((s: any) => {
        const actions: string[] = s.Action ?? [];
        return actions.some((a: string) =>
          a.includes('omics:CreateConfiguration')
        );
      });
    });
    expect(hasOmicsPolicy).toBe(true);
  });
});
