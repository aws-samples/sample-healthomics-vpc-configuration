// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Determines the number of NAT gateways based on deployment mode.
 *
 * - production: 1 NAT gateway per AZ (high availability)
 * - development: 1 shared NAT gateway (cost-optimized)
 *
 * The returned count is passed to CDK's Vpc construct `natGateways` property,
 * which handles NAT gateway creation, EIP allocation, and private subnet routing.
 */
export function getNatGatewayCount(
  deploymentMode: 'production' | 'development',
  azCount: number
): number {
  if (azCount < 1) {
    throw new Error('azCount must be at least 1');
  }
  return deploymentMode === 'production' ? azCount : 1;
}
