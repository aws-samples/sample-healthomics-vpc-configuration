// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { HEALTHOMICS_REGION_MAP } from './constants';

/**
 * Validates the deployment region and optional AZs against the HealthOmics-supported mapping.
 *
 * @param region - The AWS region to validate
 * @param requestedAzs - Optional list of specific AZs to use
 * @returns The resolved list of AZs to use
 * @throws Error if the region is not supported or if any requested AZ is invalid
 */
export function validateRegion(region: string, requestedAzs?: string[]): string[] {
  const regionConfig = Object.prototype.hasOwnProperty.call(HEALTHOMICS_REGION_MAP, region)
    ? HEALTHOMICS_REGION_MAP[region]
    : undefined;

  if (!regionConfig) {
    const supportedRegions = Object.keys(HEALTHOMICS_REGION_MAP).join(', ');
    throw new Error(
      `Region '${region}' is not supported by HealthOmics. Supported regions: ${supportedRegions}`
    );
  }

  if (!requestedAzs || requestedAzs.length === 0) {
    return regionConfig.azs;
  }

  const invalidAzs = requestedAzs.filter((az) => !regionConfig.azs.includes(az));

  if (invalidAzs.length > 0) {
    const validAzs = regionConfig.azs.join(', ');
    throw new Error(
      `Availability zone(s) '${invalidAzs.join(', ')}' are not valid for HealthOmics in region '${region}'. Valid AZs: ${validAzs}`
    );
  }

  return requestedAzs;
}
