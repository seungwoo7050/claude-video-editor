# 프로덕션 배포 가이드

**목표**: AWS/GCP에 VrewCraft 프로덕션 배포  
**난이도**: ⭐⭐⭐⭐☆ (상급)  
**예상 시간**: 5-6시간 (정독 + 실습)  
**선행 과정**: [98-docker-compose-stack.md](98-docker-compose-stack.md)

---

## 📋 목차

1. [인프라 아키텍처](#part-1-인프라-아키텍처)
2. [AWS 배포](#part-2-aws-배포)
3. [CI/CD 파이프라인](#part-3-cicd-파이프라인)
4. [운영 관리](#part-4-운영-관리)

---

## Part 1: 인프라 아키텍처

### 1.1 프로덕션 아키텍처

```
┌─────────────────────────────────────────────────┐
│              CloudFront (CDN)                   │
│         SSL/TLS, Static Assets Cache            │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│          Application Load Balancer              │
│    Auto Scaling, Health Checks, SSL Offload    │
└────┬─────────────────────────────────┬──────────┘
     │                                 │
┌────▼──────────┐              ┌──────▼────────────┐
│   Frontend    │              │     Backend       │
│   ECS Tasks   │              │    ECS Tasks      │
│   (React)     │              │    (Node.js)      │
└───────────────┘              └────┬──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
           │   RDS         │  │  ElastiCache│  │   S3     │
           │  (PostgreSQL) │  │   (Redis)   │  │ (Videos) │
           └───────────────┘  └─────────────┘  └──────────┘

Monitoring:
- CloudWatch (Logs, Metrics)
- X-Ray (Tracing)
- SNS (Alerts)
```

---

### 1.2 비용 견적

```
AWS 월간 비용 (예상):

Compute:
- ECS Fargate (2 tasks): $30-50
- ALB: $20

Storage:
- RDS PostgreSQL (db.t3.micro): $15
- ElastiCache Redis (cache.t3.micro): $12
- S3 (1TB 비디오): $23

Network:
- Data Transfer: $10-30
- CloudFront: $5-15

Monitoring:
- CloudWatch: $5

Total: $120-170/month

초기 비용 절감:
- AWS Free Tier (12개월)
- RDS 예약 인스턴스
- Spot Instances (개발 환경)
```

---

## Part 2: AWS 배포

### 2.1 VPC 및 네트워크

```bash
#!/bin/bash
# scripts/aws/setup-vpc.sh

# VPC 생성
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=vrewcraft-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC created: $VPC_ID"

# 서브넷 생성 (2 AZ)
SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Subnets created: $SUBNET_1, $SUBNET_2"

# Internet Gateway
IGW=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW

echo "Internet Gateway attached: $IGW"

# Route Table
ROUTE_TABLE=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $ROUTE_TABLE \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW

aws ec2 associate-route-table \
  --route-table-id $ROUTE_TABLE \
  --subnet-id $SUBNET_1

aws ec2 associate-route-table \
  --route-table-id $ROUTE_TABLE \
  --subnet-id $SUBNET_2

echo "Route table configured: $ROUTE_TABLE"

# Security Group
SG=$(aws ec2 create-security-group \
  --group-name vrewcraft-sg \
  --description "VrewCraft security group" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

echo "Security Group: $SG"
```

---

### 2.2 RDS PostgreSQL

```bash
#!/bin/bash
# scripts/aws/setup-rds.sh

# DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name vrewcraft-db-subnet \
  --db-subnet-group-description "VrewCraft DB subnet" \
  --subnet-ids $SUBNET_1 $SUBNET_2

# RDS Instance
aws rds create-db-instance \
  --db-instance-identifier vrewcraft-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids $SG \
  --db-subnet-group-name vrewcraft-db-subnet \
  --backup-retention-period 7 \
  --publicly-accessible false

echo "RDS instance creating... (takes 5-10 minutes)"

# Wait for available
aws rds wait db-instance-available \
  --db-instance-identifier vrewcraft-db

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier vrewcraft-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS endpoint: $DB_ENDPOINT"
```

---

### 2.3 ElastiCache Redis

```bash
#!/bin/bash
# scripts/aws/setup-redis.sh

# Cache Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name vrewcraft-redis-subnet \
  --cache-subnet-group-description "VrewCraft Redis subnet" \
  --subnet-ids $SUBNET_1 $SUBNET_2

# Redis Cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id vrewcraft-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name vrewcraft-redis-subnet \
  --security-group-ids $SG

echo "Redis cluster creating..."

# Wait for available
aws elasticache wait cache-cluster-available \
  --cache-cluster-id vrewcraft-redis

# Get endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id vrewcraft-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

echo "Redis endpoint: $REDIS_ENDPOINT"
```

---

### 2.4 ECS Fargate 배포

```bash
#!/bin/bash
# scripts/aws/setup-ecs.sh

# ECS Cluster
aws ecs create-cluster \
  --cluster-name vrewcraft-cluster

# ECR Repositories
aws ecr create-repository --repository-name vrewcraft-frontend
aws ecr create-repository --repository-name vrewcraft-backend

# Docker 이미지 빌드 및 푸시
$(aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI)

docker build -t vrewcraft-frontend ./frontend
docker tag vrewcraft-frontend:latest $ECR_URI/vrewcraft-frontend:latest
docker push $ECR_URI/vrewcraft-frontend:latest

docker build -t vrewcraft-backend ./backend
docker tag vrewcraft-backend:latest $ECR_URI/vrewcraft-backend:latest
docker push $ECR_URI/vrewcraft-backend:latest

# Task Definition
cat > task-definition.json <<EOF
{
  "family": "vrewcraft-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "$ECR_URI/vrewcraft-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DB_HOST", "value": "$DB_ENDPOINT"},
        {"name": "REDIS_HOST", "value": "$REDIS_ENDPOINT"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/vrewcraft-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json

# ECS Service
aws ecs create-service \
  --cluster vrewcraft-cluster \
  --service-name vrewcraft-backend-service \
  --task-definition vrewcraft-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=backend,containerPort=3001"

echo "ECS service deployed"
```

---

### 2.5 Application Load Balancer

```bash
#!/bin/bash
# scripts/aws/setup-alb.sh

# ALB
ALB=$(aws elbv2 create-load-balancer \
  --name vrewcraft-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $SG \
  --scheme internet-facing \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB created: $ALB"

# Target Group
TARGET_GROUP=$(aws elbv2 create-target-group \
  --name vrewcraft-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group: $TARGET_GROUP"

# Listener (HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$SSL_CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP

# HTTP → HTTPS 리다이렉트
aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"

echo "ALB listeners configured"
```

---

## Part 3: CI/CD 파이프라인

### 3.1 GitHub Actions (ECS 배포)

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
  ECS_CLUSTER: vrewcraft-cluster
  ECS_SERVICE: vrewcraft-backend-service
  ECS_TASK_DEFINITION: task-definition.json

jobs:
  deploy:
    runs-on: ubuntu-22.04
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build, tag, and push image
      env:
        ECR_REPOSITORY: vrewcraft-backend
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./backend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
    
    - name: Update ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: ${{ env.ECS_TASK_DEFINITION }}
        container-name: backend
        image: ${{ env.ECR_REGISTRY }}/vrewcraft-backend:${{ github.sha }}
    
    - name: Deploy to ECS
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: ${{ env.ECS_SERVICE }}
        cluster: ${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
    
    - name: Slack notification
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'VrewCraft deployment ${{ job.status }}'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

### 3.2 Blue-Green 배포

```bash
#!/bin/bash
# scripts/deploy-blue-green.sh

# 현재 활성 환경 확인
CURRENT=$(aws ecs describe-services \
  --cluster vrewcraft-cluster \
  --services vrewcraft-backend-service \
  --query 'services[0].deployments[0].taskDefinition' \
  --output text)

echo "Current: $CURRENT"

# 새 Task Definition 등록
NEW_TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New Task Definition: $NEW_TASK_DEF"

# Green 환경 생성
aws ecs create-service \
  --cluster vrewcraft-cluster \
  --service-name vrewcraft-backend-service-green \
  --task-definition $NEW_TASK_DEF \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "..."

# Green 헬스 체크
sleep 60
HEALTH=$(curl -s http://green-alb/health | jq -r .status)

if [ "$HEALTH" == "ok" ]; then
  echo "✅ Green environment healthy"
  
  # 트래픽 전환 (ALB)
  aws elbv2 modify-rule \
    --rule-arn $RULE_ARN \
    --actions Type=forward,TargetGroupArn=$GREEN_TARGET_GROUP
  
  echo "🔄 Traffic switched to Green"
  
  # Blue 환경 삭제 (대기)
  sleep 300
  aws ecs delete-service \
    --cluster vrewcraft-cluster \
    --service vrewcraft-backend-service \
    --force
  
  echo "🗑️  Blue environment deleted"
else
  echo "❌ Green environment unhealthy - rollback"
  aws ecs delete-service \
    --cluster vrewcraft-cluster \
    --service vrewcraft-backend-service-green \
    --force
fi
```

---

## Part 4: 운영 관리

### 4.1 CloudWatch 알림

```yaml
# cloudwatch-alarms.yml
Resources:
  HighCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: vrewcraft-high-cpu
      MetricName: CPUUtilization
      Namespace: AWS/ECS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic
  
  HighMemoryAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: vrewcraft-high-memory
      MetricName: MemoryUtilization
      Namespace: AWS/ECS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic
  
  ErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: vrewcraft-error-rate
      MetricName: 5XXError
      Namespace: AWS/ApplicationELB
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic
  
  SNSTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: vrewcraft-alerts
      Subscription:
        - Protocol: email
          Endpoint: alerts@vrewcraft.com
```

---

### 4.2 자동 스케일링

```yaml
# autoscaling.yml
Resources:
  AutoScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 10
      MinCapacity: 2
      ResourceId: service/vrewcraft-cluster/vrewcraft-backend-service
      RoleARN: !GetAtt AutoScalingRole.Arn
      ScalableDimension: ecs:service:DesiredCount
      ServiceNamespace: ecs
  
  CPUScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: vrewcraft-cpu-scaling
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref AutoScalingTarget
      TargetTrackingScalingPolicyConfiguration:
        PredefinedMetricSpecification:
          PredefinedMetricType: ECSServiceAverageCPUUtilization
        TargetValue: 70.0
        ScaleInCooldown: 300
        ScaleOutCooldown: 60
```

---

### 4.3 백업 및 복구

```bash
#!/bin/bash
# scripts/backup.sh

# RDS 스냅샷
aws rds create-db-snapshot \
  --db-instance-identifier vrewcraft-db \
  --db-snapshot-identifier vrewcraft-db-$(date +%Y%m%d-%H%M%S)

# S3 비디오 백업
aws s3 sync s3://vrewcraft-videos s3://vrewcraft-videos-backup \
  --storage-class GLACIER

# PostgreSQL 덤프
pg_dump -h $DB_HOST -U admin -d vrewcraft | gzip > backup-$(date +%Y%m%d).sql.gz

# S3 업로드
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://vrewcraft-backups/

echo "✅ Backup complete"
```

---

### 4.4 로그 분석

```bash
# CloudWatch Insights 쿼리
aws logs start-query \
  --log-group-name /ecs/vrewcraft-backend \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string '
    fields @timestamp, @message
    | filter @message like /ERROR/
    | stats count() by bin(5m)
  '
```

---

## 🎯 실전 체크리스트

### 인프라
- [ ] VPC, 서브넷, IGW 생성
- [ ] Security Group 설정
- [ ] RDS PostgreSQL 배포
- [ ] ElastiCache Redis 배포
- [ ] S3 버킷 생성

### 컨테이너
- [ ] ECR 리포지토리 생성
- [ ] Docker 이미지 빌드 및 푸시
- [ ] ECS Cluster, Task Definition
- [ ] ECS Service 배포

### 네트워크
- [ ] Application Load Balancer
- [ ] Target Group, Listener
- [ ] SSL 인증서 (ACM)
- [ ] CloudFront CDN

### CI/CD
- [ ] GitHub Actions 워크플로우
- [ ] AWS Secrets Manager
- [ ] Blue-Green 배포 스크립트

### 모니터링
- [ ] CloudWatch 알림
- [ ] 자동 스케일링
- [ ] 로그 수집 및 분석
- [ ] 백업 자동화

---

## 📚 면접 예상 질문

### 기초
1. **ECS vs EKS 차이는?**
   - ECS: AWS 전용, 간단
   - EKS: Kubernetes, 복잡, 이식성

2. **Fargate란?**
   - 서버리스 컨테이너 (EC2 관리 불필요)

3. **ALB vs NLB?**
   - ALB: HTTP/HTTPS (Layer 7)
   - NLB: TCP/UDP (Layer 4)

4. **Blue-Green 배포란?**
   - 무중단 배포 (트래픽 전환)

5. **RDS Multi-AZ란?**
   - 고가용성 (장애 시 자동 Failover)

### 심화
6. **ECS Task 롤링 업데이트 전략은?**
   - minimumHealthyPercent, maximumPercent

7. **CloudWatch vs X-Ray 차이는?**
   - CloudWatch: 메트릭, 로그
   - X-Ray: 분산 추적 (tracing)

8. **Auto Scaling 정책 종류는?**
   - Target Tracking, Step Scaling, Scheduled

9. **RDS 백업 전략은?**
   - 자동 스냅샷 (7일), 수동 스냅샷

10. **비용 최적화 방법은?**
    - Reserved Instances, Spot Instances, S3 Lifecycle

---

**완료**: VrewCraft 전체 문서 시리즈 (90-99) 완성 🎉
