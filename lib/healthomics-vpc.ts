// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { HealthOmicsVpcProps } from './healthomics-vpc-props';
import { validateRegion } from './region-validator';
import { createVpc } from './vpc-builder';
import { getNatGatewayCount } from './nat-gateway-builder';
import { createSecurityGroup } from './security-group-builder';
import { createVpcEndpoints } from './endpoint-builder';
import { createNetworkingConfiguration } from './networking-config-builder';

/**
 * An L3 CDK construct that provisions a VPC tailored for AWS HealthOmics
 * VPC networking. Orchestrates region validation, VPC/subnet creation,
 * NAT gateways, security groups, VPC endpoints, flow logs, outputs, and tagging.
 *
 * Optionally creates a HealthOmics networking configuration that registers the
 * VPC subnets and security group with the HealthOmics service, enabling
 * `--networking-mode VPC --configuration-name <name>` when starting runs.
 */
export class HealthOmicsVpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly securityGroup: ec2.SecurityGroup;
  /** The HealthOmics networking configuration name, if created. */
  public readonly networkingConfigurationName?: string;

  constructor(scope: Construct, id: string, props: HealthOmicsVpcProps = {}) {
    super(scope, id);

    // Apply defaults
    const cidr = props.cidr ?? '10.0.0.0/16';
    const deploymentMode = props.deploymentMode ?? 'development';
    const outboundCidrs = props.outboundCidrs ?? ['0.0.0.0/0'];
    const vpcEndpoints = props.vpcEndpoints ?? false;
    const enableFlowLogs = props.enableFlowLogs ?? true;
    const environment = props.environment ?? 'dev';
    const projectName = props.projectName ?? 'healthomics';

    // Get region from the enclosing stack
    const region = cdk.Stack.of(this).region;

    // 1. Validate region and resolve AZs
    const resolvedAzs = validateRegion(region, props.availabilityZones);

    // 2. Create VPC with NAT gateway count based on deployment mode
    const natGateways = getNatGatewayCount(deploymentMode, resolvedAzs.length);
    const { vpc, privateSubnets } = createVpc(this, {
      cidr,
      azs: resolvedAzs,
      projectName,
      environment,
      natGateways,
    });
    this.vpc = vpc;
    this.privateSubnets = privateSubnets;

    // 3. Create security group
    this.securityGroup = createSecurityGroup(this, {
      vpc,
      outboundCidrs,
      projectName,
      environment,
    });

    // 4. Create VPC endpoints (unless disabled)
    if (vpcEndpoints !== false) {
      createVpcEndpoints(this, {
        vpc,
        privateSubnets,
        securityGroup: this.securityGroup,
        endpointServices: vpcEndpoints,
        region,
      });
    }

    // 5. Enable VPC Flow Logs when requested
    if (enableFlowLogs) {
      vpc.addFlowLog(`${projectName}-${environment}-flow-log`);
    }

    // 6. CloudFormation outputs (Task 9.2)
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: privateSubnets.map((s) => s.subnetId).join(','),
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: this.securityGroup.securityGroupId,
    });

    new cdk.CfnOutput(this, 'AvailabilityZones', {
      value: resolvedAzs.join(','),
    });

    // 7. Create HealthOmics networking configuration (if requested)
    if (props.networkingConfigurationName) {
      const netConfig = createNetworkingConfiguration(this, {
        configurationName: props.networkingConfigurationName,
        privateSubnets,
        securityGroup: this.securityGroup,
        projectName,
        environment,
      });
      this.networkingConfigurationName = netConfig.configurationName;

      new cdk.CfnOutput(this, 'NetworkingConfigurationName', {
        value: netConfig.configurationName,
      });

      new cdk.CfnOutput(this, 'NetworkingConfigurationArn', {
        value: netConfig.configurationArn,
      });
    }

    // 8. Tagging (Task 9.3)
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Project', projectName);

    if (props.tags) {
      for (const [key, value] of Object.entries(props.tags)) {
        cdk.Tags.of(this).add(key, value);
      }
    }
  }
}
