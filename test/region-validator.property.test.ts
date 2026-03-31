// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Feature: healthomics-vpc, Property 12: Invalid region rejection
// **Validates: Requirements 10.2**

import * as fc from 'fast-check';
import { validateRegion } from '../lib/region-validator';
import { HEALTHOMICS_REGION_MAP } from '../lib/constants';

const supportedRegions = Object.keys(HEALTHOMICS_REGION_MAP);

describe('Property 12: Invalid region rejection', () => {
  it('should throw a descriptive error for any region not in the supported regions map', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !supportedRegions.includes(s)),
        (invalidRegion) => {
          expect(() => validateRegion(invalidRegion)).toThrowError(
            /not supported by HealthOmics/
          );

          try {
            validateRegion(invalidRegion);
          } catch (e: any) {
            // Error message should list all supported regions
            for (const region of supportedRegions) {
              expect(e.message).toContain(region);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: healthomics-vpc, Property 13: Invalid AZ rejection
// **Validates: Requirements 10.3**

describe('Property 13: Invalid AZ rejection', () => {
  it('should throw a descriptive error for any AZ not in the region\'s valid AZ list', () => {
    const regionEntries = Object.entries(HEALTHOMICS_REGION_MAP);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: regionEntries.length - 1 }).chain((idx) => {
          const [region, config] = regionEntries[idx];
          const validAzs = config.azs;
          // Generate a random string that is not a valid AZ for this region
          const invalidAzArb = fc
            .string({ minLength: 1 })
            .filter((s) => !validAzs.includes(s));
          return invalidAzArb.map((invalidAz) => ({ region, validAzs, invalidAz }));
        }),
        ({ region, validAzs, invalidAz }) => {
          expect(() => validateRegion(region, [invalidAz])).toThrowError(
            /are not valid for HealthOmics/
          );

          try {
            validateRegion(region, [invalidAz]);
          } catch (e: any) {
            // Error message should list all valid AZs for the region
            for (const az of validAzs) {
              expect(e.message).toContain(az);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
