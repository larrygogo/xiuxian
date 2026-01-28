/**
 * 表单配置类型定义
 * 与服务器端类型定义保持一致
 */

/**
 * 表单字段配置
 */
export interface FormFieldConfig {
  name: string;           // 字段名
  type: string;           // 输入类型（text, password, email等）
  label: string;          // 显示标签
  placeholder: string;    // 占位符文本
  icon?: string;          // 图标
  required: boolean;      // 是否必填
  validation: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;     // 正则表达式
    errorMessage?: string;
  };
  ui?: {
    order: number;        // 显示顺序
    autocomplete?: string;
  };
}

/**
 * 表单配置
 */
export interface FormConfig {
  title: string;
  subtitle: string;
  submitButtonText: string;
  fields: FormFieldConfig[];
  styling?: {
    theme?: string;
    customColors?: Record<string, string>;
  };
}
