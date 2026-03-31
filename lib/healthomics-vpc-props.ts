// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export interface HealthOmicsVpcProps {
  /** VPC CIDR block. Defaults to '10.0.0.0/16'. */
  readonly cidr?: string;

  /** Deployment mode: 'production' (1 NAT per AZ) or 'development' (1 shared NAT). Defaults to 'development'. */
  readonly deploymentMode?: 'production' | 'development';

  /** Specific AZs to use. Must be valid HealthOmics AZs for the region. Defaults to all HealthOmics AZs in the region. */
  readonly availabilityZones?: string[];

  /** Custom outbound CIDR blocks for the security group. Defaults to ['0.0.0.0/0']. */
  readonly outboundCidrs?: string[];

  /** Custom list of VPC endpoint service names, or false to disable. Defaults to no endpoints. */
  readonly vpcEndpoints?: string[] | false;

  /** Enable VPC Flow Logs. Defaults to true. */
  readonly enableFlowLogs?: boolean;

  /** Environment name for tagging (e.g., 'dev', 'prod'). */
  readonly environment?: string;

  /** Project name for tagging. */
  readonly projectName?: string;

  /** Additional custom tags to apply to all resources. */
  readonly tags?: Record<string, string>;

  /**
   * Name for the HealthOmics networking configuration.
   * When set, creates a networking configuration resource that registers the VPC
   * subnets and security group with HealthOmics. Use this name with
   * `--networking-mode VPC --configuration-name <name>` when starting runs.
   * When not set, no networking configuration is created.
   */
  readonly networkingConfigurationName?: string;
}
