/**
 * Purge stuck notification messages from RabbitMQ queue
 * Run this once to clear old messages with invalid shipper_id
 */

const amqp = require('amqplib');
require('dotenv').config();

async function purgeNotificationQueue() {
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  
  console.log('Connecting to RabbitMQ...');
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();
  
  // Purge the notifications queue
  const queueName = 'notifications';
  
  try {
    const result = await channel.purgeQueue(queueName);
    console.log(`✓ Purged ${result.messageCount} messages from '${queueName}' queue`);
  } catch (error) {
    if (error.code === 404) {
      console.log(`Queue '${queueName}' does not exist`);
    } else {
      throw error;
    }
  }
  
  await channel.close();
  await connection.close();
  
  console.log('Done! Restart your backend server now.');
}

purgeNotificationQueue().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
