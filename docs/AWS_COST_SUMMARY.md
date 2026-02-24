# AWS Cost Summary for 10 Users

## Quick Answer

**Monthly AWS Cost: $57-60/month** (or $31-35/month with optimizations)

**AI Costs: $0** - Users pay their own AI providers (Anthropic, OpenAI, etc.)

---

## Detailed Cost Breakdown

### Standard Setup ($57-60/month)

| Service                       | Monthly Cost | Notes                                       |
| ----------------------------- | ------------ | ------------------------------------------- |
| **ECS Fargate**               | $7-10        | 2 tasks × 0.25 vCPU × 0.5GB RAM             |
| **Application Load Balancer** | $16          | Optional - can skip to save money           |
| **RDS PostgreSQL**            | $15          | db.t3.micro (1 vCPU, 1GB RAM, 20GB storage) |
| **ElastiCache Redis**         | $12          | cache.t3.micro (0.5GB memory)               |
| **EBS Storage**               | $3           | 20GB for RDS + 10GB for ECS                 |
| **Data Transfer**             | $1           | ~2GB/month (minimal traffic)                |
| **CloudWatch**                | $2           | Basic monitoring and logs                   |
| **S3**                        | $1           | Logs and backups                            |
| **Route 53**                  | $0.50        | DNS (if using custom domain)                |
| **Total**                     | **$57-60**   |                                             |

### Optimized Setup ($31-35/month)

Skip the load balancer and use CloudFront for HTTPS instead:

| Service               | Monthly Cost | Notes                |
| --------------------- | ------------ | -------------------- |
| **ECS Fargate**       | $7-10        | Same as above        |
| **CloudFront**        | $1           | HTTPS instead of ALB |
| **RDS PostgreSQL**    | $15          | Same as above        |
| **ElastiCache Redis** | $12          | Same as above        |
| **Storage & Network** | $4           | Same as above        |
| **Total**             | **$31-35**   | **Save $26/month**   |

---

## Usage Pattern: 10 Users × 10 Resumes/Day

### Daily Operations:

- 10 user logins
- 10 resume reads (Google Docs API)
- 100 resume updates (10 per user)
- 100 AI API calls (to user's AI provider - **NOT AWS**)

### Resource Usage:

- **CPU**: Burst during AI processing, idle most of the time
- **Memory**: ~200MB average, spikes to 500MB
- **Database**: ~1,000 writes/day, ~5,000 reads/day
- **Network**: ~60MB/day

**This workload easily fits in the minimal configuration above.**

---

## Cost Per User

- **Per user per month**: $57 ÷ 10 = **$5.70/user/month**
- **Per resume update**: $57 ÷ (10 users × 10 resumes × 30 days) = **$0.019/resume**

---

## What You Pay vs. What Users Pay

### You Pay (AWS Infrastructure):

- ✅ Compute (ECS Fargate): $7-10/month
- ✅ Database (RDS): $15/month
- ✅ Cache (Redis): $12/month
- ✅ Load Balancer: $16/month (optional)
- ✅ Storage & Network: $4/month
- **Total: $57-60/month**

### Users Pay (AI Services):

- ✅ Anthropic API: ~$0.003 per resume update
- ✅ OpenAI API: ~$0.002 per resume update
- ✅ Google OAuth: Free
- **You pay: $0** (users pay their providers directly)

---

## Cost Optimization Options

### Option 1: Skip Load Balancer (Recommended for Start)

- Use CloudFront for HTTPS: **$1/month** instead of $16/month
- **Save: $15/month** → **Total: $42-45/month**

### Option 2: Use Fargate Spot (if available)

- 70% discount on compute: **$2-3/month** instead of $7-10/month
- **Save: $5-7/month** → **Total: $37-40/month**

### Option 3: Both Optimizations

- **Total: $31-35/month**

---

## Scaling Costs

| Users | Monthly Cost | Cost/User |
| ----- | ------------ | --------- |
| 10    | $57-60       | $5.70     |
| 50    | $80-90       | $1.60     |
| 100   | $120-140     | $1.20     |
| 500   | $300-400     | $0.60     |

**Note**: Cost per user decreases as you scale due to fixed infrastructure costs.

---

## Minimum Viable Setup

**Absolute minimum for 10 users: $31/month**

- ECS Fargate: $7-10
- RDS PostgreSQL: $15
- ElastiCache Redis: $12
- CloudFront: $1
- Storage & Network: $4
- **Total: ~$39/month**

**Trade-offs:**

- No load balancer (use CloudFront instead)
- Single task (no redundancy)
- Less monitoring

---

## Monthly Cost Breakdown

### Fixed Costs (regardless of usage):

- RDS: $15/month
- Redis: $12/month
- Load Balancer: $16/month (optional)
- **Subtotal: $43/month** (or $27 without ALB)

### Variable Costs (based on usage):

- ECS Fargate: $7-10/month (scales with CPU/memory usage)
- Data Transfer: $1/month (scales with traffic)
- Storage: $3/month (scales with data)
- **Subtotal: $11-14/month**

### Total:

- **With ALB**: $54-57/month
- **Without ALB**: $38-41/month

---

## Free Tier Considerations

AWS Free Tier (first 12 months) includes:

- ✅ 750 hours/month of t2.micro/t3.micro instances
- ✅ 20GB EBS storage
- ✅ 5GB S3 storage
- ✅ 15GB data transfer out

**For 10 users, you might qualify for:**

- RDS: Free tier covers db.t2.micro (but we're using t3.micro)
- **Potential savings: $0-5/month** if using free tier eligible instances

---

## Summary

**For 10 users using the app once a day to update 10 resumes:**

1. **AWS Infrastructure**: **$57-60/month** (or $31-35/month optimized)
2. **AI Costs**: **$0** (users pay their providers)
3. **Cost per user**: **$5.70/month**
4. **Cost per resume**: **$0.019**

**Recommendation**: Start with the optimized setup ($31-35/month) and add a load balancer later if needed.

All AI API calls go directly to user's own AI providers (Anthropic, OpenAI, etc.), so you never pay for AI services - only infrastructure.
