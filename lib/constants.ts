// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export interface RegionConfig {
  readonly azs: string[];
  readonly azIds: string[];
}

export type HealthOmicsRegionMap = Record<string, RegionConfig>;

export const HEALTHOMICS_REGION_MAP: HealthOmicsRegionMap = {
  'us-west-2': {
    azs: ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
    azIds: ['usw2-az2', 'usw2-az1', 'usw2-az3', 'usw2-az4'],
  },
  'us-east-1': {
    azs: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1f'],
    azIds: ['use1-az4', 'use1-az6', 'use1-az1', 'use1-az2', 'use1-az5'],
  },
  'us-east-2': {
    azs: ['us-east-2a', 'us-east-2b', 'us-east-2c'],
    azIds: ['use2-az1', 'use2-az2', 'use2-az3'],
  },
  'eu-west-1': {
    azs: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
    azIds: ['euw1-az2', 'euw1-az3', 'euw1-az1'],
  },
  'eu-central-1': {
    azs: ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
    azIds: ['euc1-az2', 'euc1-az3', 'euc1-az1'],
  },
  'eu-west-2': {
    azs: ['eu-west-2a', 'eu-west-2b', 'eu-west-2c'],
    azIds: ['euw2-az2', 'euw2-az3', 'euw2-az1'],
  },
  'ap-southeast-1': {
    azs: ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
    azIds: ['apse1-az2', 'apse1-az1', 'apse1-az3'],
  },
  'il-central-1': {
    azs: ['il-central-1a', 'il-central-1b', 'il-central-1c'],
    azIds: ['ilc1-az1', 'ilc1-az2', 'ilc1-az3'],
  },
  'ap-northeast-2': {
    azs: ['ap-northeast-2a', 'ap-northeast-2b', 'ap-northeast-2c'],
    azIds: ['apne2-az1', 'apne2-az2', 'apne2-az3'],
  },
  // Tokyo supports zones a, c, and d only — there is no ap-northeast-1b for HealthOmics
  'ap-northeast-1': {
    azs: ['ap-northeast-1a', 'ap-northeast-1c', 'ap-northeast-1d'],
    azIds: ['apne1-az4', 'apne1-az1', 'apne1-az2'],
  },
};

export const DEFAULT_VPC_ENDPOINTS = [
  's3',
  'ecr.api',
  'ecr.dkr',
  'ssm',
  'logs',
];
