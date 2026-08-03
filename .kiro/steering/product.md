# Product Overview

HealthOmics VPC is an AWS CDK L3 construct that provisions a production-ready VPC for AWS HealthOmics workflow execution.

It handles multi-AZ networking, NAT gateways, least-privilege security groups, VPC endpoints, flow logs, and region validation in a single construct.

## Key Capabilities

- Region validation against HealthOmics-supported AWS regions (10 regions)
- Two deployment modes: `development` (1 shared NAT, lower cost) and `production` (1 NAT per AZ, HA)
- Least-privilege security group: no inbound, HTTPS-only (port 443) outbound
- VPC endpoints for S3 (gateway), ECR API, ECR Docker, SSM, and CloudWatch Logs (interface)
- VPC Flow Logs to CloudWatch
- CloudFormation outputs for VpcId, PrivateSubnetIds, SecurityGroupId, AvailabilityZones
- Configurable CIDR, AZs, outbound CIDRs, endpoints, tagging

## Target Users

Teams running genomics/bioinformatics pipelines on AWS HealthOmics that need a correctly configured VPC without manual networking setup.
