const axios = require('axios');

async function testLokiQuery() {
  console.log('Testing Loki log queries...\n');

  try {
    // Query recent logs with broader time range
    const query = '{service="task-manager"}';
    const startTime = Date.now() - 600000; // 10 minutes ago
    const endTime = Date.now() + 60000; // 1 minute in the future

    console.log(`Query: ${query}`);
    console.log(
      `Time range: ${new Date(startTime).toISOString()} to ${new Date(
        endTime
      ).toISOString()}`
    );

    const response = await axios.get(
      `http://localhost:3100/loki/api/v1/query_range`,
      {
        params: {
          query,
          start: startTime * 1000000, // nanoseconds
          end: endTime * 1000000, // nanoseconds
          step: '1s',
        },
      }
    );

    console.log('✅ Loki query successful');
    console.log('Response status:', response.status);
    console.log('Logs found:', response.data.data.result.length);

    if (response.data.data.result.length > 0) {
      console.log('Sample log entries:');
      response.data.data.result.forEach((stream, index) => {
        console.log(`Stream ${index}:`, stream.stream);
        console.log(`Values:`, stream.values.slice(0, 3)); // Show first 3 values
      });
    } else {
      console.log('No logs found. Trying different queries...');

      // Try a broader query
      const broadQuery = '{}';
      const broadResponse = await axios.get(
        `http://localhost:3100/loki/api/v1/query_range`,
        {
          params: {
            query: broadQuery,
            start: startTime * 1000000,
            end: endTime * 1000000,
            step: '1s',
          },
        }
      );

      console.log(
        `Broad query results: ${broadResponse.data.data.result.length} streams`
      );
      if (broadResponse.data.data.result.length > 0) {
        console.log('Available streams:');
        broadResponse.data.data.result.forEach((stream, index) => {
          console.log(`  ${index}:`, stream.stream);
        });
      }
    }

    return response.data.data.result;
  } catch (error) {
    console.error('❌ Loki query failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

testLokiQuery();
