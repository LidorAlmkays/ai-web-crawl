import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Base DTO for W3C Trace Context headers
 * 
 * This DTO provides optional W3C trace context fields that can be extended
 * by other DTOs that need to carry distributed tracing information.
 * 
 * The fields are optional because:
 * - Auto-instrumentation (KafkaJS, Express) automatically injects/reads these headers
 * - Manual injection is only needed for custom scenarios
 * - Validation only applies when the fields are present
 * 
 * @see https://www.w3.org/TR/trace-context/
 */
export class BaseTraceHeaderDto {
  /**
   * W3C Trace Context traceparent header
   * 
   * Format: 00-<32-hex>-<16-hex>-<2-hex>
   * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
   * 
   * This field is optional and only validated when present.
   * Auto-instrumentation will automatically inject this header.
   */
  @IsOptional()
  @IsString()
  @MaxLength(55)
  @Matches(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/, {
    message: 'traceparent must follow W3C format: 00-<32hex>-<16hex>-<2hex>',
  })
  traceparent?: string;

  /**
   * W3C Trace Context tracestate header
   * 
   * Format: key1=value1,key2=value2 (comma-separated key-value pairs)
   * Maximum length: 512 characters total
   * 
   * Examples:
   * - "vendorname1=opaqueValue1,vendorname2=opaqueValue2"
   * - "rojo=00f067aa0ba902b7,congo=t61rcWkgMzE"
   * 
   * This field is optional and only validated when present.
   * Auto-instrumentation will automatically inject this header.
   */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  tracestate?: string;
}

// Export type alias for the class
export type BaseTraceHeaderDtoType = BaseTraceHeaderDto;
