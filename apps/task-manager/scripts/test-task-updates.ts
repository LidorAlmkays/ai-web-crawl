import { Pool } from 'pg';
import { Kafka } from 'kafkajs';
import { trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'tasks_manager',
});

// Kafka configuration
const kafka = new Kafka({
  clientId: 'task-update-test',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

// W3C Trace Context Propagator
const propagator = new W3CTraceContextPropagator();

async function getNewTasksFromDB(): Promise<Array<{ id: string; user_email: string; user_query: string; original_url: string }>> {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fetching new tasks from database...');
    
    const query = `
      SELECT id, user_email, user_query, original_url 
      FROM web_crawl_tasks 
      WHERE status = 'new' 
      ORDER BY created_at DESC 
      LIMIT 2
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ No new tasks found in database');
      return [];
    }
    
    console.log(`✅ Found ${result.rows.length} new tasks:`);
    result.rows.forEach((task, index) => {
      console.log(`  ${index + 1}. ID: ${task.id}`);
      console.log(`     Email: ${task.user_email}`);
      console.log(`     Query: ${task.user_query}`);
      console.log(`     URL: ${task.original_url}`);
    });
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function sendTaskUpdate(taskId: string, status: 'completed' | 'error', result: string): Promise<void> {
  const activeSpan = trace.getActiveSpan();
  const ctx = activeSpan?.spanContext();
  
  // Create trace context
  const traceContext: Record<string, string> = {};
  if (ctx?.traceId && ctx.traceId !== '00000000000000000000000000000000') {
    traceContext.traceId = ctx.traceId;
  }
  if (ctx?.spanId && ctx.spanId !== '0000000000000000') {
    traceContext.spanId = ctx.spanId;
  }
  
  // Create W3C trace context
  const carrier: Record<string, string> = {};
  if (activeSpan && ctx?.traceId && ctx.traceId !== '00000000000000000000000000000000') {
    // Create traceparent header manually
    const traceparent = `00-${ctx.traceId}-${ctx.spanId}-01`;
    carrier.traceparent = traceparent;
  }
  
  const headers = {
    task_type: 'web-crawl',
    status: status,
    task_id: taskId,
    timestamp: new Date().toISOString(),
    source: 'task-manager-test',
    version: '1.0.0',
    ...carrier, // Include W3C trace context
  };
  
  const message = status === 'completed' 
    ? {
        task_id: taskId,
        status: status,
        crawl_result: result,
        finished_at: new Date().toISOString(),
      }
    : {
        task_id: taskId,
        status: status,
        error: result,
        finished_at: new Date().toISOString(),
      };
  
  console.log(`📤 Sending ${status.toUpperCase()} update for task ${taskId}`);
  console.log(`   Headers:`, JSON.stringify(headers, null, 2));
  console.log(`   Message:`, JSON.stringify(message, null, 2));
  
  await producer.send({
    topic: 'task-status',
    messages: [
      {
        key: taskId,
        value: JSON.stringify(message),
        headers: Object.fromEntries(
          Object.entries(headers).map(([key, value]) => [key, Buffer.from(value)])
        ),
      },
    ],
  });
  
  console.log(`✅ ${status.toUpperCase()} update sent successfully for task ${taskId}`);
}

async function testTaskUpdates(): Promise<void> {
  console.log('🚀 Starting task update test...\n');
  
  try {
    // Connect to Kafka
    await producer.connect();
    console.log('✅ Connected to Kafka\n');
    
    // Get new tasks from database
    const tasks = await getNewTasksFromDB();
    
    if (tasks.length === 0) {
      console.log('❌ No tasks to update. Please create some new tasks first.');
      return;
    }
    
    if (tasks.length < 2) {
      console.log(`⚠️  Only found ${tasks.length} task(s). Will update what we have.`);
    }
    
    console.log('\n📝 Starting task updates...\n');
    
    // Update first task to completed
    if (tasks[0]) {
      await sendTaskUpdate(
        tasks[0].id,
        'completed',
        'Task completed successfully! Found 5 products matching the criteria.'
      );
    }
    
    // Update second task to error
    if (tasks[1]) {
      await sendTaskUpdate(
        tasks[1].id,
        'error',
        'Task failed: Network timeout occurred while crawling the website.'
      );
    }
    
    console.log('\n✅ Task update test completed successfully!');
    console.log('\n📊 Expected Results:');
    console.log('   - Task Manager should receive the status update messages');
    console.log('   - Database should be updated with new status and result data');
    console.log('   - Logs should show the task processing with trace context');
    
  } catch (error) {
    console.error('❌ Error during task update test:', error);
    throw error;
  } finally {
    await producer.disconnect();
    await pool.end();
  }
}

// Run the test
testTaskUpdates().catch(console.error);
