#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import { HealthOmicsVpc } from '../lib';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'HealthOmicsVpcStack', {
  env: { region: 'us-east-1' },
});

new HealthOmicsVpc(stack, 'HealthOmicsVpc', {
  networkingConfigurationName: 'vpc-connectivity',
  deploymentMode: 'production',
  environment: 'prod',
  projectName: 'healthomics-vpc-configuration',
  vpcEndpoints: ['s3tables'],
});

app.synth();
