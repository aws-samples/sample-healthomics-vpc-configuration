// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit tests for SecurityGroupBuilder
// Requirements: 5.3, 5.5, 5.6

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { createSecurityGroup } from '../lib/security-group-builder';

function buildStack() {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', {
    env: { region: 'us-east-1' },
  });
  const { vpc } = createVpc(stack, {
    cidr: '10.0.0.0/16',
    azs: ['us-east-1a', 'us-east-1b'],
    projectName: 'myproj',
    environment: 'dev',
  });
  return { stack, vpc };
}

function findHealthOmicsSg(template: Template) {
  const sgs = template.findResources('AWS::EC2::SecurityGroup');
  return Object.entries(sgs).filter(
    ([, sg]: [string, any]) =>
      (sg.Properties?.GroupDescription ?? '').includes('HealthOmics')
  );
}

describe('SecurityGroupBuilder', () => {
  // Requirement 5.3: deny all inbound traffic
  it('should have no inbound rules (SecurityGroupIngress is empty or absent)', () => {
    const { stack, vpc } = buildStack();

    createSecurityGroup(stack, {
      vpc,
      outboundCidrs: ['0.0.0.0/0'],
      projectName: 'myproj',
      environment: 'dev',
    });

    const template = Template.fromStack(stack);
    const sgEntries = findHealthOmicsSg(template);
    expect(sgEntries.length).toBe(1);

    const sgProps = (sgEntries[0][1] as any).Properties;
    const ingress = sgProps.SecurityGroupIngress ?? [];
    expect(ingress).toEqual([]);

    // Also verify no separate ingress resources reference this SG
    const ingressResources = template.findResources(
      'AWS::EC2::SecurityGroupIngress'
    );
    expect(Object.keys(ingressResources).length).toBe(0);
  });

  // Requirement 5.5: default outbound is 0.0.0.0/0 on port 443
  it('should allow outbound HTTPS to 0.0.0.0/0 on port 443 when outboundCidrs is ["0.0.0.0/0"]', () => {
    const { stack, vpc } = buildStack();

    createSecurityGroup(stack, {
      vpc,
      outboundCidrs: ['0.0.0.0/0'],
      projectName: 'myproj',
      environment: 'dev',
    });

    const template = Template.fromStack(stack);
    const sgEntries = findHealthOmicsSg(template);
    expect(sgEntries.length).toBe(1);

    const sgProps = (sgEntries[0][1] as any).Properties;
    const egressRules: any[] = sgProps.SecurityGroupEgress ?? [];

    // Should have exactly one egress rule for 0.0.0.0/0 on port 443
    const httpsEgress = egressRules.filter(
      (r: any) =>
        r.CidrIp === '0.0.0.0/0' && r.FromPort === 443 && r.ToPort === 443
    );
    expect(httpsEgress.length).toBe(1);
  });

  // Requirement 5.6: security group count is between 1 and 5
  it('should create between 1 and 5 security groups', () => {
    const { stack, vpc } = buildStack();

    createSecurityGroup(stack, {
      vpc,
      outboundCidrs: ['10.0.0.0/16'],
      projectName: 'myproj',
      environment: 'dev',
    });

    const template = Template.fromStack(stack);
    const sgs = template.findResources('AWS::EC2::SecurityGroup');
    const sgCount = Object.keys(sgs).length;
    expect(sgCount).toBeGreaterThanOrEqual(1);
    expect(sgCount).toBeLessThanOrEqual(5);
  });
});
