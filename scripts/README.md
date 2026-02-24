# Social Media Agent Scripts

## Setup

First ensure you have all dependencies installed:

```bash
npm install
```

And your `LANGCHAIN_API_KEY`, `LANGGRAPH_API_URL` environment variables set:

```bash
LANGCHAIN_API_KEY=...
LANGGRAPH_API_URL=...
```

Some scripts will send output to Slack. If you want this output to post to Slack, ensure you have the `SLACK_BOT_OAUTH_TOKEN` and `SLACK_CHANNEL_ID` environment variables set:

```bash
SLACK_BOT_OAUTH_TOKEN=...
SLACK_CHANNEL_ID=...
```

If you don't want to post to Slack, the script will print the output to the console.

## Scripts

### Get Scheduled Runs

This script will fetch all scheduled runs and either send them to Slack or print them to the console.

```bash
npm run get:scheduled_runs
```

### Get all used links

This script will fetch and log all links which are currently scheduled, or interrupted and awaiting human intervention.

```bash
npm run get:used_links
```

### Generate Demo Post

This script will invoke the graph to generate a post. It defaults to a LangChain blog post, and typically used to demonstrate how the Social Media Agent works.

```bash
npm run generate_post
```

### Delete Run(s) & Thread(s)

This script will delete runs and associated threads. It requires setting the run ID(s) and thread ID(s) in the script.

```bash
npm run graph:delete:run_thread
```

### Backfill

This script will backfill your deployment with links. It contains two functions, one for backfilling from Slack, and one for backfilling from a list of links. You'll need to uncomment one/both of the functions to use them.

```bash
npm run graph:backfill
```

### Create Cron

This script will create a cron job to run the `ingest_data` graph.

```bash
npm run cron:create
```

### Delete Cron

This script will delete a cron job.

```bash
npm run cron:delete
```

### List Crons

This script will list all cron jobs.

```bash
npm run cron:list
```
