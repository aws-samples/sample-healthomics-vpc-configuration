// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { validateRegion } from '../lib/region-validator';
import { HEALTHOMICS_REGION_MAP } from '../lib/constants';

describe('RegionValidator - validateRegion', () => {
  // Requirement 10.1, 2.6: Valid region with no AZs returns all region AZs
  it('should return all region AZs when no AZs are specified (us-east-1)', () => {
    const result = validateRegion('us-east-1');
    expect(result).toEqual(['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1f']);
    expect(result).toHaveLength(5);
  });

  it('should return all region AZs when an empty array is provided', () => {
    const result = validateRegion('us-west-2', []);
    expect(result).toEqual(['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d']);
  });

  // Requirement 10.1: Ohio (us-east-2) is a supported HealthOmics VPC region
  it('should return all AZs for us-east-2 (Ohio)', () => {
    const result = validateRegion('us-east-2');
    expect(result).toEqual(['us-east-2a', 'us-east-2b', 'us-east-2c']);
    expect(result).toHaveLength(3);
  });

  // Requirement 10.1: Tokyo (ap-northeast-1) supports zones a, c, d only (no "b")
  it('should return a, c, d for ap-northeast-1 (Tokyo) and not include ap-northeast-1b', () => {
    const result = validateRegion('ap-northeast-1');
    expect(result).toEqual(['ap-northeast-1a', 'ap-northeast-1c', 'ap-northeast-1d']);
    expect(result).not.toContain('ap-northeast-1b');
  });

  // Requirement 10.3: ap-northeast-1b is not a valid HealthOmics AZ for Tokyo
  it('should reject ap-northeast-1b as an invalid AZ for Tokyo', () => {
    expect(() => validateRegion('ap-northeast-1', ['ap-northeast-1b'])).toThrowError(
      /Availability zone\(s\) 'ap-northeast-1b' are not valid for HealthOmics in region 'ap-northeast-1'/
    );
  });

  // Requirement 10.1: Valid region with valid AZ subset returns those AZs
  it('should return the requested AZs when they are valid for the region', () => {
    const result = validateRegion('us-east-1', ['us-east-1a', 'us-east-1b']);
    expect(result).toEqual(['us-east-1a', 'us-east-1b']);
  });

  // Requirement 10.2: Unsupported region throws with descriptive error
  it('should throw an error with supported regions listed for unsupported region', () => {
    expect(() => validateRegion('us-west-3')).toThrowError(
      /Region 'us-west-3' is not supported by HealthOmics/
    );

    try {
      validateRegion('us-west-3');
    } catch (e: any) {
      const supportedRegions = Object.keys(HEALTHOMICS_REGION_MAP);
      for (const region of supportedRegions) {
        expect(e.message).toContain(region);
      }
    }
  });

  // Requirement 10.3: Invalid AZ throws with descriptive error
  it('should throw an error listing valid AZs when an invalid AZ is provided', () => {
    expect(() => validateRegion('us-east-1', ['us-east-1z'])).toThrowError(
      /Availability zone\(s\) 'us-east-1z' are not valid for HealthOmics in region 'us-east-1'/
    );

    try {
      validateRegion('us-east-1', ['us-east-1z']);
    } catch (e: any) {
      for (const az of HEALTHOMICS_REGION_MAP['us-east-1'].azs) {
        expect(e.message).toContain(az);
      }
    }
  });
});
