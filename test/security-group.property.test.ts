// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 7: Security group outbound CIDR restriction

import * as fc from 'fast-check';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { createVpc } from '../lib/vpc-builder';
import { createSecurityGroup } from '../lib/security-group-builder';
import { HEALTHOMICS_REGION_MAP } from '../lib/constants';

/**
 * Generator for a random list of 1-5 valid private-range CIDR blocks.
 * Uses 10.x.x.x/y and 172.16.x.x/y ranges.
 */
const cidrListArb = fc.array(
  fc.oneof(
    // 10.x.x.x/y with mask 16-28
    fc.record({
      a: fc.integer({ min: 0, max: 255 }),
      b: fc.integer({ min: 0, max: 255 }),
      c: fc.integer({ min: 0, max: 255 }),
      mask: fc.integer({ min: 16, max: 28 }),
    }).map(({ a, b, c, mask }) => `10.${a}.${b}.${c}/${mask}`),
    // 172.16.x.x/y with mask 16-28
    fc.record({
      sub: fc.integer({ min: 16, max: 31 }),
      b: fc.integer({ min: 0, max: 255 }),
      c: fc.integer({ min: 0, max: 255 }),
      mask: fc.integer({ min: 16, max: 28 }),
    }).map(({ sub, b, c, mask }) => `172.${sub}.${b}.${c}/${mask}`)
  ),
  { minLength: 1, maxLength: 5 }
);

/**
 * Pick a random supported region.
 */
const regionArb = fc.constantFrom(...Object.keys(HEALTHOMICS_REGION_MAP));

// **Validates: Requirements 5.2, 5.4**
describe('Property 7: Security group outbound CIDR restriction', () => {
  it('should have egress rules allowing port 443 only to the provided CIDRs and no other outbound rules', () => {
    fc.assert(
      fc.property(regionArb, cidrListArb, (region, cidrs) => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', { env: { region } });

        const azs = HEALTHOMICS_REGION_MAP[region].azs.slice(0, 2);
        const { vpc } = createVpc(stack, {
          cidr: '10.0.0.0/16',
          azs,
          projectName: 'test',
          environment: 'dev',
        });

        createSecurityGroup(stack, {
          vpc,
          outboundCidrs: cidrs,
          projectName: 'test',
          environment: 'dev',
        });

        const template = Template.fromStack(stack);

        // Find the HealthOmics security group
        const sgs = template.findResources('AWS::EC2::SecurityGroup');
        const sgEntries = Object.entries(sgs).filter(
          ([, sg]: [string, any]) =>
            (sg.Properties?.GroupDescription ?? '').includes('HealthOmics')
        );
        expect(sgEntries.length).toBe(1);

        const sgProps = (sgEntries[0][1] as any).Properties;
        const egressRules: any[] = sgProps.SecurityGroupEgress ?? [];

        // Number of egress rules should match number of provided CIDRs
        expect(egressRules.length).toBe(cidrs.length);

        // All rules must be port 443 TCP
        for (const rule of egressRules) {
          expect(rule.FromPort).toBe(443);
          expect(rule.ToPort).toBe(443);
          expect(rule.IpProtocol).toBe('tcp');
        }

        // The set of egress CIDRs should match the input CIDRs exactly
        const egressCidrs = egressRules.map((r: any) => r.CidrIp);
        expect([...egressCidrs].sort()).toEqual([...cidrs].sort());

        // No "allow all" (-1 protocol) rules should exist
        for (const rule of egressRules) {
          expect(rule.IpProtocol).not.toBe('-1');
        }
      }),
      { numRuns: 100 }
    );
  });
});
