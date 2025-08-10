import {
  DeleteItemCommand,
  DeleteItemInput,
  DynamoDBClient,
  GetItemCommand,
  GetItemInput,
  PutItemCommand,
  PutItemInput,
  QueryCommand,
  QueryInput,
  ScanCommand,
  ScanInput,
  UpdateItemCommand,
  UpdateItemInput
} from '@aws-sdk/client-dynamodb';
import { Logger } from '@type';

const getDynamoDBClient = () => {
  return new DynamoDBClient();
};

const dynamoDBClient = getDynamoDBClient();

class DynamoService {

  logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.logClientConfig();
  }

  private logClientConfig() {
    this.logger.debug('DynamoDB Client Configuration', {
      region: dynamoDBClient.config.region,
      endpoint: dynamoDBClient.config.endpoint,
      credentials: dynamoDBClient.config.credentials ? 'Present' : 'Missing'
    });
  }

  /**
   * Queries the DynamoDB table
   * @param params - The query parameters
   * @returns The query result
   */
  async query(params: QueryInput) {
    try {
      this.logger.debug('DynamoDB Query Starting', {
        tableName: params.TableName,
        indexName: params.IndexName,
        keyCondition: params.KeyConditionExpression
      });

      const result = await dynamoDBClient.send(new QueryCommand(params));

      this.logger.debug('DynamoDB Query Success', {
        tableName: params.TableName,
        itemCount: result.Items?.length || 0,
        scannedCount: result.ScannedCount
      });

      return result;
    } catch (error) {
      this.logger.error('DynamoDB Query Error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Puts an item into the DynamoDB table
   * @param params - The put item parameters
   * @returns The put item result
   */
  async put(params: PutItemInput) {
    try {
      this.logger.debug('DynamoDB Put Starting', {
        tableName: params.TableName,
        item: params.Item
      });

      const result = await dynamoDBClient.send(new PutItemCommand(params));

      this.logger.debug('DynamoDB Put Success', {
        tableName: params.TableName,
        item: params.Item
      });

      return result;
    }
    catch (error) {
      this.logger.error('DynamoDB Put Error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deletes an item from the DynamoDB table
   * @param params - The delete item parameters
   * @returns The delete item result
   */
  async delete(params: DeleteItemInput) {
    try {
      this.logger.debug('DynamoDB Delete Starting', {
        tableName: params.TableName,
        key: params.Key
      });

      const result = await dynamoDBClient.send(new DeleteItemCommand(params));

      this.logger.debug('DynamoDB Delete Success', {
        tableName: params.TableName,
        key: params.Key
      });

      return result;
    } catch (error) {
      this.logger.error('DynamoDB Delete Error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Updates an item in the DynamoDB table
   * @param params - The update item parameters
   * @returns The update item result
   */
  async update(params: UpdateItemInput) {
    try {
      this.logger.debug('DynamoDB Update Starting', {
        tableName: params.TableName,
        key: params.Key
      });

      const result = await dynamoDBClient.send(new UpdateItemCommand(params));

      this.logger.debug('DynamoDB Update Success', {
        tableName: params.TableName,
        key: params.Key
      });

      return result;
    }
    catch (error) {
      this.logger.error('DynamoDB Update Error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Gets an item from the DynamoDB table
   * @param params - The get item parameters
   * @returns The get item result
   */
  async get(params: GetItemInput) {
    try {
      this.logger.debug('DynamoDB Get Starting', {
        tableName: params.TableName,
        key: params.Key
      });

      const result = await dynamoDBClient.send(new GetItemCommand(params));

      this.logger.debug('DynamoDB Get Success', {
        tableName: params.TableName,
        key: params.Key
      });

      return result;
    }
    catch (error) {
      this.logger.error('DynamoDB Get Error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Scans the DynamoDB table
   * @param params - The scan parameters
   * @returns The scan result
   */
  async scan(params: ScanInput) {
    try {
      this.logger.debug('DynamoDB Scan Starting', {
        tableName: params.TableName
      });

      const result = await dynamoDBClient.send(new ScanCommand(params));

      this.logger.debug('DynamoDB Scan Success', {
        tableName: params.TableName
      });

      return result;
    } catch (error) {
      this.logger.error('DynamoDB Scan Error', {
        error: error.message
      });
      throw error;
    }
  }
}

export default DynamoService;
