# HealthOmics VPC

An AWS CDK L3 construct that provisions a production-ready VPC for [AWS HealthOmics](https://aws.amazon.com/healthomics/) workflow execution. It handles multi-AZ networking, NAT gateways, least-privilege security groups, VPC endpoints, flow logs, and region validation — all in a single construct.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VPC (10.0.0.0/16)                                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Public Sub-a │  │ Public Sub-b │  │ Public Sub-c │      │
│  │  NAT Gateway │  │  NAT (prod)  │  │  NAT (prod)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐      │
│  │Private Sub-a │  │Private Sub-b │  │Private Sub-c │      │
│  │  HealthOmics │  │  HealthOmics │  │  HealthOmics │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  VPC Endpoints: optional (e.g. S3 Tables, ECR, SSM, etc.)   │
│  Security Group: outbound HTTPS 443 only                    │
│  Flow Logs → CloudWatch                                     │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import * as cdk from 'aws-cdk-lib';
import { HealthOmicsVpc } from './lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack', {
  env: { region: 'us-east-1' },
});

// All defaults — dev mode, single NAT, no endpoints, flow logs on
new HealthOmicsVpc(stack, 'HealthOmicsVpc');
```

## Installation

```bash
npm install
```

## Usage Examples

Update bin/app.ts based on the examples below depending on your needs.

### Minimal (development)

```typescript
new HealthOmicsVpc(stack, 'DevVpc');
```

Creates a VPC in dev mode with 1 shared NAT gateway, no VPC endpoints, flow logs enabled, and subnets in all HealthOmics AZs for the stack's region.

### Production with HA

```typescript
new HealthOmicsVpc(stack, 'ProdVpc', {
  deploymentMode: 'production',
  environment: 'prod',
  projectName: 'genomics-pipeline',
});
```

Deploys 1 NAT gateway per AZ for high availability with same-AZ routing.

### Custom configuration

```typescript
new HealthOmicsVpc(stack, 'CustomVpc', {
  cidr: '172.16.0.0/16',
  deploymentMode: 'production',
  availabilityZones: ['us-east-1a', 'us-east-1b'],
  outboundCidrs: ['10.0.0.0/8'],
  vpcEndpoints: ['s3', 'ecr.api', 'ecr.dkr'],
  enableFlowLogs: true,
  environment: 'staging',
  projectName: 'my-project',
  tags: { Team: 'bioinformatics', CostCenter: 'research' },
});
```

### Enable VPC endpoints

```typescript
new HealthOmicsVpc(stack, 'WithEndpoints', {
  vpcEndpoints: ['s3', 's3tables', 'ecr.api', 'ecr.dkr'],
});
```

Pass `'s3'` for a gateway endpoint; all other service names (e.g. `'s3tables'`, `'ecr.api'`) create interface endpoints.

### With HealthOmics Configuration Resource

```typescript
new HealthOmicsVpc(stack, 'HealthOmicsVpc', {
  networkingConfigurationName: 'my-genomics-vpc',
  deploymentMode: 'production',
  environment: 'prod',
  projectName: 'genomics-pipeline',
});
```

This creates the VPC infrastructure and registers it with HealthOmics as a named networking configuration. You can then start VPC-enabled runs with:

```bash
aws omics start-run \
  --workflow-id <id> \
  --role-arn <role-arn> \
  --output-uri s3://bucket/prefix/ \
  --networking-mode VPC \
  --configuration-name my-genomics-vpc
```

## Configuration Reference

| Property | Type | Default | Description |
|---|---|---|---|
| `cidr` | `string` | `'10.0.0.0/16'` | VPC CIDR block |
| `deploymentMode` | `'production' \| 'development'` | `'development'` | `production`: 1 NAT/AZ, `development`: 1 shared NAT |
| `availabilityZones` | `string[]` | All HealthOmics AZs | Specific AZs to use (must be valid for the region) |
| `outboundCidrs` | `string[]` | `['0.0.0.0/0']` | CIDR blocks allowed for outbound HTTPS (port 443) |
| `vpcEndpoints` | `string[] \| false` | `false` | VPC endpoint service names (e.g. `'s3'`, `'s3tables'`, `'ecr.api'`), or `false` to disable |
| `enableFlowLogs` | `boolean` | `true` | Enable VPC Flow Logs to CloudWatch |
| `environment` | `string` | `'dev'` | Environment name for tagging and naming |
| `projectName` | `string` | `'healthomics'` | Project name for tagging and naming |
| `tags` | `Record<string, string>` | `{}` | Additional custom tags applied to all resources |
| `networkingConfigurationName` | `string` | — | When set, creates a HealthOmics networking configuration with this name |

## Deployment Modes

| Mode | NAT Gateways | Cost | Use Case |
|---|---|---|---|
| `development` | 1 shared | Lower | Dev/test environments |
| `production` | 1 per AZ | Higher | Production workloads requiring HA |

## Supported Regions

The construct validates that the stack is deployed in a HealthOmics-supported region:

| Region | AZs |
|---|---|
| `us-east-1` | 5 AZs (a, b, c, d, f) |
| `us-west-2` | 4 AZs (a, b, c, d) |
| `eu-west-1` | 3 AZs (a, b, c) |
| `eu-west-2` | 3 AZs (a, b, c) |
| `eu-central-1` | 3 AZs (a, b, c) |
| `ap-southeast-1` | 3 AZs (a, b, c) |
| `ap-northeast-2` | 3 AZs (a, b, c) |
| `il-central-1` | 3 AZs (a, b, c) |

Deploying to an unsupported region or specifying invalid AZs will fail at synth time with a descriptive error.

## CloudFormation Outputs

The construct exports these values for use in HealthOmics run configurations:

| Output | Description |
|---|---|
| `VpcId` | VPC resource ID |
| `PrivateSubnetIds` | Comma-separated private subnet IDs |
| `SecurityGroupId` | Security group ID |
| `AvailabilityZones` | Comma-separated AZ names |
| `NetworkingConfigurationName` | HealthOmics networking configuration name (when configured) |
| `NetworkingConfigurationArn` | HealthOmics networking configuration ARN (when configured) |

## Exposed Properties

After instantiation, you can reference these on the construct:

```typescript
const omicsVpc = new HealthOmicsVpc(stack, 'Vpc');

omicsVpc.vpc;            // ec2.Vpc
omicsVpc.privateSubnets; // ec2.ISubnet[]
omicsVpc.securityGroup;  // ec2.SecurityGroup
omicsVpc.networkingConfigurationName; // string | undefined
```

## Project Structure

```
├── bin/
│   └── app.ts                  # Example CDK app
├── lib/
│   ├── index.ts                # Barrel export
│   ├── healthomics-vpc.ts      # L3 construct (orchestrator)
│   ├── healthomics-vpc-props.ts # Props interface
│   ├── constants.ts            # Region map & default endpoints
│   ├── region-validator.ts     # Region/AZ validation
│   ├── vpc-builder.ts          # VPC & subnet creation
│   ├── nat-gateway-builder.ts  # NAT gateway count logic
│   ├── security-group-builder.ts # Security group creation
│   ├── endpoint-builder.ts     # VPC endpoint creation
│   └── networking-config-builder.ts # HealthOmics networking config (custom resource)
├── test/
│   ├── region-validator.test.ts
│   ├── region-validator.property.test.ts
│   ├── vpc-builder.property.test.ts
│   ├── nat-gateway.property.test.ts
│   ├── security-group.test.ts
│   ├── security-group.property.test.ts
│   ├── endpoint.test.ts
│   ├── endpoint.property.test.ts
│   ├── healthomics-vpc.test.ts
│   ├── healthomics-vpc.property.test.ts
│   └── networking-config.test.ts
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Testing

```bash
# Run all tests
npm test

# Run with verbose output
npx jest --verbose

# Run a specific test file
npx jest test/healthomics-vpc.test.ts
```

The test suite includes 38 tests across 11 suites:

- 24 unit tests using `aws-cdk-lib/assertions` for CloudFormation template verification
- 14 property-based tests using [fast-check](https://github.com/dubzzz/fast-check) (100 iterations each) covering correctness properties like subnet-per-AZ correspondence, NAT gateway modes, security group rules, endpoint placement, tagging, and region validation

## Building & Deploying

```bash
# Compile TypeScript
npm run build

# Synthesize CloudFormation template
npx cdk synth

# Deploy the stack
npx cdk deploy

# Deploy without confirmation prompts
npx cdk deploy --require-approval never

# Destroy the stack and all its resources
npx cdk destroy
```

## How It Works

The `HealthOmicsVpc` construct orchestrates five internal components in sequence:

1. **RegionValidator** — validates the deployment region and AZs against the HealthOmics-supported mapping
2. **VpcBuilder** — creates the VPC with DNS support, public/private subnets, and an Internet Gateway
3. **NatGatewayBuilder** — determines NAT gateway count based on deployment mode (CDK handles the actual creation)
4. **SecurityGroupBuilder** — creates a least-privilege security group (no inbound, HTTPS-only outbound)
5. **EndpointBuilder** — creates VPC endpoints when configured: S3 as a gateway endpoint, all others (e.g. S3 Tables, ECR, SSM) as interface endpoints
6. **NetworkingConfigBuilder** (optional) — registers the VPC with HealthOmics as a named networking configuration via a custom resource calling the HealthOmics API

After component creation, the construct enables VPC Flow Logs (if configured), emits CloudFormation outputs, and applies tags to all resources.

