// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 10: Resource tagging
// **Validates: Requirements 8.1, 8.2, 8.3**

import * as fc from 'fast-check';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HealthOmicsVpc } from '../lib/healthomics-vpc';

const REGION = 'us-east-1';

/** Alphanumeric string generator */
const alphanumArb = (min: number, max: number) =>
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: min,
    maxLength: max,
  });

/** Generator for custom tag maps (0-3 tags with alphanumeric keys/values) */
const customTagsArb = fc
  .array(
    fc.tuple(alphanumArb(3, 10), alphanumArb(3, 10)),
    { minLength: 0, maxLength: 3 }
  )
  .map((pairs) => {
    const tags: Record<string, string> = {};
    for (const [k, v] of pairs) {
      tags[k] = v;
    }
    return tags;
  });

describe('Property 10: Resource tagging', () => {
  it('should apply Environment, Project, and custom tags to all resources', () => {
    fc.assert(
      fc.property(
        alphanumArb(3, 10),
        alphanumArb(3, 15),
        customTagsArb,
        (environment, projectName, customTags) => {
          const app = new cdk.App();
          const stack = new cdk.Stack(app, 'TestStack', {
            env: { region: REGION },
          });

          new HealthOmicsVpc(stack, 'TestVpc', {
            environment,
            projectName,
            tags: customTags,
            enableFlowLogs: false,
            vpcEndpoints: false,
          });

          const template = Template.fromStack(stack);
          const allResources = template.toJSON().Resources;

          // Collect all resources that support Tags
          for (const [, resource] of Object.entries(allResources)) {
            const res = resource as any;
            const tags: Array<{ Key: string; Value: string }> = res.Properties?.Tags;
            if (!tags || !Array.isArray(tags)) continue;

            const tagMap: Record<string, string> = {};
            for (const t of tags) {
              tagMap[t.Key] = t.Value;
            }

            // Environment tag
            expect(tagMap['Environment']).toBe(environment);
            // Project tag
            expect(tagMap['Project']).toBe(projectName);
            // Custom tags
            for (const [key, value] of Object.entries(customTags)) {
              expect(tagMap[key]).toBe(value);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: healthomics-vpc, Property 11: Resource naming includes environment and project
// **Validates: Requirements 8.4**

describe('Property 11: Resource naming includes environment and project', () => {
  it('should include both environment and project name in all named resources', () => {
    fc.assert(
      fc.property(
        alphanumArb(3, 10),
        alphanumArb(3, 10),
        (environment, projectName) => {
          const app = new cdk.App();
          const stack = new cdk.Stack(app, 'TestStack', {
            env: { region: REGION },
          });

          new HealthOmicsVpc(stack, 'TestVpc', {
            environment,
            projectName,
            enableFlowLogs: false,
            vpcEndpoints: false,
          });

          const template = Template.fromStack(stack);
          const allResources = template.toJSON().Resources;

          for (const [logicalId, resource] of Object.entries(allResources)) {
            const res = resource as any;
            const props = res.Properties ?? {};

            // Check Name tag if present
            const tags: Array<{ Key: string; Value: string }> = props.Tags;
            if (tags && Array.isArray(tags)) {
              const nameTag = tags.find((t: any) => t.Key === 'Name');
              if (nameTag) {
                const nameValue: string = nameTag.Value;
                expect(nameValue.toLowerCase()).toContain(projectName.toLowerCase());
                expect(nameValue.toLowerCase()).toContain(environment.toLowerCase());
              }
            }

            // Check physical name properties (GroupName, SecurityGroupName, etc.)
            const physicalNameKeys = ['GroupName', 'SecurityGroupName'];
            for (const key of physicalNameKeys) {
              if (typeof props[key] === 'string') {
                expect(props[key].toLowerCase()).toContain(projectName.toLowerCase());
                expect(props[key].toLowerCase()).toContain(environment.toLowerCase());
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
