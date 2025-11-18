// 头颈癌CRF风险预测器 - SGD模型版本
class CRF预测器 {
    constructor() {
        this.模型参数 = null;
        this.模型加载状态 = '加载中';
        this.初始化事件监听();
        this.加载模型();
    }

    // 初始化事件监听
    初始化事件监听() {
        // 输入验证
        this.设置输入验证();
        // 表单提交
        document.getElementById('predictionForm').addEventListener('submit', (e) => this.处理表单提交(e));
    }

    // 设置输入验证
    设置输入验证() {
        const 数值输入框 = ['血清白蛋白', '年龄', '白细胞计数', '中性粒细胞', '血红蛋白'];
        
        数值输入框.forEach(字段 => {
            const 输入框 = document.getElementById(字段);
            if (输入框) {
                输入框.addEventListener('blur', () => this.验证数值输入(字段));
            }
        });
    }

    // 验证数值输入
    验证数值输入(字段名) {
        const 输入框 = document.getElementById(字段名);
        const 值 = parseFloat(输入框.value);
        let 有效 = true;
        let 提示信息 = '';

        // 定义验证规则
        const 验证规则 = {
            '血清白蛋白': { min: 20, max: 60, message: '血清白蛋白正常范围: 20-60 g/L' },
            '年龄': { min: 18, max: 100, message: '年龄范围: 18-100岁' },
            '白细胞计数': { min: 1, max: 30, message: '白细胞计数范围: 1-30 ×10⁹/L' },
            '中性粒细胞': { min: 1, max: 20, message: '中性粒细胞范围: 1-20 ×10⁹/L' },
            '血红蛋白': { min: 60, max: 180, message: '血红蛋白范围: 60-180 g/L' }
        };

        const 规则 = 验证规则[字段名];
        if (规则 && (值 < 规则.min || 值 > 规则.max || isNaN(值))) {
            有效 = false;
            提示信息 = 规则.message;
        }

        // 更新UI状态
        if (有效) {
            输入框.classList.remove('is-invalid');
            输入框.classList.add('is-valid');
            this.移除错误提示(输入框);
        } else {
            输入框.classList.remove('is-valid');
            输入框.classList.add('is-invalid');
            this.显示错误提示(输入框, 提示信息);
        }

        return 有效;
    }

    // 显示错误提示
    显示错误提示(输入框, 消息) {
        this.移除错误提示(输入框);
        
        const 错误提示 = document.createElement('div');
        错误提示.className = 'invalid-feedback';
        错误提示.textContent = 消息;
        错误提示.id = `${输入框.id}-feedback`;
        
        输入框.parentNode.appendChild(错误提示);
    }

    // 移除错误提示
    移除错误提示(输入框) {
        const 现有提示 = document.getElementById(`${输入框.id}-feedback`);
        if (现有提示) {
            现有提示.remove();
        }
    }

    // 加载模型参数
    async 加载模型() {
        try {
            console.log('开始加载SGD模型参数...');
            const 响应 = await fetch('静态文件/model_params.json');
            
            if (!响应.ok) {
                throw new Error(`HTTP错误! 状态: ${响应.status}`);
            }
            
            this.模型参数 = await 响应.json();
            this.模型加载状态 = '已加载';
            
            console.log('✅ SGD模型参数加载成功');
            console.log(`模型信息: ${this.模型参数.模型信息.模型类型}, 准确率: ${this.模型参数.模型信息.准确率}`);
            
        } catch (错误) {
            console.error('❌ 模型加载失败:', 错误);
            this.模型加载状态 = '加载失败';
            this.显示错误提示('模型加载失败，请刷新页面重试');
        }
    }

    // 处理表单提交
    处理表单提交(事件) {
        事件.preventDefault();
        
        if (this.模型加载状态 !== '已加载') {
            alert('模型正在加载中，请稍后重试...');
            return;
        }

        // 验证所有必填字段
        if (!this.验证所有输入()) {
            alert('请填写完整的患者信息，并确保所有输入值在有效范围内');
            return;
        }

        // 显示加载动画
        this.显示加载状态();

        // 延迟执行预测，让加载动画显示
        setTimeout(() => {
            try {
                this.执行预测();
            } catch (错误) {
                console.error('预测错误:', 错误);
                this.显示错误结果('预测过程中发生错误: ' + 错误.message);
            }
        }, 500);
    }

    // 验证所有输入
    验证所有输入() {
        const 表单 = document.getElementById('predictionForm');
        const 输入框列表 = 表单.querySelectorAll('select[required], input[required]');
        let 所有有效 = true;

        // 验证必填字段
        输入框列表.forEach(输入框 => {
            if (!输入框.value) {
                输入框.classList.add('is-invalid');
                所有有效 = false;
            } else {
                输入框.classList.remove('is-invalid');
            }
        });

        // 验证数值范围
        const 数值字段 = ['血清白蛋白', '年龄', '白细胞计数', '中性粒细胞', '血红蛋白'];
        数值字段.forEach(字段 => {
            if (!this.验证数值输入(字段)) {
                所有有效 = false;
            }
        });

        return 所有有效;
    }

    // 显示加载状态
    显示加载状态() {
        document.getElementById('initialPrompt').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('loadingSpinner').style.display = 'block';
    }

    // 执行预测
    执行预测() {
        // 收集特征数据
        const 特征数据 = this.收集特征数据();
        const 特征数组 = this.转换为特征数组(特征数据);
        
        // 执行预测
        const 概率 = this.预测(特征数组);
        
        // 显示结果
        this.显示预测结果(概率, 特征数据);
    }

    // 收集特征数据
    收集特征数据() {
        return {
            睡眠障碍: parseInt(document.getElementById('睡眠障碍').value),
            焦虑程度: parseInt(document.getElementById('焦虑程度').value),
            抑郁程度: parseInt(document.getElementById('抑郁程度').value),
            肿瘤分期: parseInt(document.getElementById('肿瘤分期').value),
            放疗次数: parseInt(document.getElementById('放疗次数').value),
            营养风险: parseInt(document.getElementById('营养风险').value),
            疼痛: parseInt(document.getElementById('疼痛').value),
            社会支持: parseInt(document.getElementById('社会支持').value),
            病情程度: parseInt(document.getElementById('病情程度').value),
            血清白蛋白: parseFloat(document.getElementById('血清白蛋白').value),
            年龄: parseInt(document.getElementById('年龄').value),
            白细胞计数: parseFloat(document.getElementById('白细胞计数').value),
            中性粒细胞: parseFloat(document.getElementById('中性粒细胞').value),
            血红蛋白: parseFloat(document.getElementById('血红蛋白').value)
        };
    }

    // 转换为特征数组
    转换为特征数组(特征数据) {
        // 按照模型训练时的特征顺序
        return [
            特征数据.睡眠障碍,
            特征数据.焦虑程度,
            特征数据.抑郁程度,
            特征数据.肿瘤分期,
            特征数据.放疗次数,
            特征数据.营养风险,
            特征数据.疼痛,
            特征数据.社会支持,
            特征数据.病情程度,
            特征数据.血清白蛋白,
            特征数据.年龄,
            特征数据.白细胞计数,
            特征数据.中性粒细胞,
            特征数据.血红蛋白
        ];
    }

    // 预测函数
    预测(特征数组) {
        if (!this.模型参数) {
            throw new Error('模型参数未加载');
        }

        // 特征标准化
        const 标准化特征 = this.标准化特征(特征数组);
        
        // 线性组合
        let 线性输出 = this.模型参数.截距;
        for (let i = 0; i < this.模型参数.系数.length; i++) {
            线性输出 += this.模型参数.系数[i] * 标准化特征[i];
        }
        
        // Sigmoid函数计算概率
        const 概率 = 1 / (1 + Math.exp(-线性输出));
        
        return 概率;
    }

    // 特征标准化
    标准化特征(特征数组) {
        const 标准化结果 = [];
        for (let i = 0; i < 特征数组.length; i++) {
            const 标准化值 = (特征数组[i] - this.模型参数.标准化均值[i]) / this.模型参数.标准化标准差[i];
            标准化结果.push(标准化值);
        }
        return 标准化结果;
    }

    // 显示预测结果
    显示预测结果(概率, 特征数据) {
        const 风险信息 = this.获取风险等级(概率);
        const 建议列表 = this.生成个性化建议(概率, 特征数据);
        
        // 更新UI
        this.更新风险显示(概率, 风险信息);
        this.更新建议显示(建议列表);
        
        // 显示结果区域
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('resultSection').style.display = 'block';
    }

    // 获取风险等级
    获取风险等级(概率) {
        if (概率 < 0.3) {
            return {
                等级: '低风险',
                样式: 'risk-low',
                图标: '😊',
                描述: '患者CRF风险较低，建议常规监测和健康生活方式维持'
            };
        } else if (概率 < 0.7) {
            return {
                等级: '中风险',
                样式: 'risk-medium',
                图标: '😐',
                描述: '患者存在中度CRF风险，建议加强症状监测和预防性干预'
            };
        } else {
            return {
                等级: '高风险',
                样式: 'risk-high',
                图标: '😰',
                描述: '患者CRF风险较高，需要立即进行综合评估和积极干预'
            };
        }
    }

    // 更新风险显示
    更新风险显示(概率, 风险信息) {
        const 风险卡片 = document.getElementById('riskCard');
        const 概率百分比 = (概率 * 100).toFixed(1);
        
        // 更新内容
        document.getElementById('riskIcon').textContent = 风险信息.图标;
        document.getElementById('riskLevel').textContent = 风险信息.等级;
        document.getElementById('riskProbability').innerHTML = 
            `<strong>${概率百分比}%</strong> 概率`;
        document.getElementById('riskDescription').textContent = 风险信息.描述;
        
        // 更新样式
        风险卡片.className = `risk-card ${风险信息.样式}`;
    }

    // 生成个性化建议
    生成个性化建议(概率, 特征数据) {
        const 建议列表 = [];

        // 基于总体风险的建议
        if (概率 > 0.7) {
            建议列表.push({
                类型: '紧急干预',
                图标: '🚨',
                内容: '立即安排多学科团队评估，制定综合干预方案，加强症状监测频率。',
                优先级: 'high'
            });
        } else if (概率 > 0.5) {
            建议列表.push({
                类型: '预防干预',
                图标: '⚠️',
                内容: '加强症状筛查，实施预防性干预措施，定期评估治疗效果。',
                优先级: 'medium'
            });
        }

        // 基于具体特征的建议
        if (特征数据.睡眠障碍 === 1) {
            建议列表.push({
                类型: '睡眠管理',
                图标: '💤',
                内容: '制定规律作息计划，避免睡前使用电子设备，创造安静睡眠环境，考虑认知行为疗法。',
                优先级: 'medium'
            });
        }

        if (特征数据.焦虑程度 >= 3) {
            建议列表.push({
                类型: '心理支持',
                图标: '🧘',
                内容: '提供心理支持和放松训练，推荐参加支持小组，必要时转诊心理科进行评估。',
                优先级: 'medium'
            });
        }

        if (特征数据.抑郁程度 >= 3) {
            建议列表.push({
                类型: '情绪管理',
                图标: '😔',
                内容: '加强情绪状态评估，提供情感支持，考虑心理咨询或药物治疗评估。',
                优先级: 'medium'
            });
        }

        if (特征数据.营养风险 === 1) {
            建议列表.push({
                类型: '营养支持',
                图标: '🍎',
                内容: '咨询临床营养师制定个体化膳食方案，增加优质蛋白质摄入，监测体重变化。',
                优先级: 'medium'
            });
        }

        if (特征数据.血清白蛋白 < 35) {
            建议列表.push({
                类型: '蛋白补充',
                图标: '🥛',
                内容: '加强优质蛋白摄入（鱼、蛋、奶、豆制品），监测血清白蛋白水平变化。',
                优先级: 'medium'
            });
        }

        if (特征数据.疼痛 === 1) {
            建议列表.push({
                类型: '疼痛管理',
                图标: '💊',
                内容: '定期评估疼痛程度，优化镇痛方案，提供非药物疼痛缓解方法。',
                优先级: 'medium'
            });
        }

        if (特征数据.社会支持 <= 2) {
            建议列表.push({
                类型: '社会支持',
                图标: '🤝',
                内容: '加强社会支持网络建设，联系社会工作者，提供家庭护理指导。',
                优先级: 'low'
            });
        }

        // 如果没有特定建议，提供一般性建议
        if (建议列表.length === 0) {
            建议列表.push({
                类型: '健康维护',
                图标: '✅',
                内容: '继续保持健康生活方式，定期进行CRF筛查，维持现有护理方案。',
                优先级: 'low'
            });
        }

        // 按优先级排序
        return 建议列表.sort((a, b) => {
            const 优先级顺序 = { high: 3, medium: 2, low: 1 };
            return 优先级顺序[b.优先级] - 优先级顺序[a.优先级];
        });
    }

    // 更新建议显示
    更新建议显示(建议列表) {
        const 容器 = document.getElementById('suggestionsContainer');
        let 建议HTML = '';

        建议列表.forEach(建议 => {
            建议HTML += `
                <div class="suggestion-item">
                    <div class="d-flex align-items-start">
                        <span class="fs-5 me-3">${建议.图标}</span>
                        <div>
                            <h6 class="mb-1">${建议.类型}</h6>
                            <p class="mb-0 text-muted">${建议.内容}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        容器.innerHTML = 建议HTML;
    }

    // 显示错误结果
    显示错误结果(错误消息) {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('resultSection').style.display = 'block';
        
        const 风险卡片 = document.getElementById('riskCard');
        风险卡片.className = 'risk-card risk-high';
        
        document.getElementById('riskIcon').textContent = '❌';
        document.getElementById('riskLevel').textContent = '计算错误';
        document.getElementById('riskProbability').innerHTML = '<strong>无法计算</strong>';
        document.getElementById('riskDescription').textContent = 错误消息;
        
        document.getElementById('suggestionsContainer').innerHTML = `
            <div class="suggestion-item">
                <p class="mb-0">请刷新页面重试，或检查控制台错误信息。</p>
            </div>
        `;
    }
}

// 页面加载完成后初始化预测器
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 初始化头颈癌CRF风险预测工具...');
    window.CRF预测器实例 = new CRF预测器();
});

// 添加一些工具函数
function 填充测试数据() {
    // 仅供测试使用
    const 测试数据 = {
        '睡眠障碍': '1',
        '焦虑程度': '3',
        '抑郁程度': '2',
        '肿瘤分期': '3',
        '放疗次数': '2',
        '营养风险': '1',
        '疼痛': '1',
        '社会支持': '2',
        '病情程度': '1',
        '血清白蛋白': '36.5',
        '年龄': '58',
        '白细胞计数': '8.2',
        '中性粒细胞': '6.1',
        '血红蛋白': '128'
    };

    for (const [字段, 值] of Object.entries(测试数据)) {
        const 元素 = document.getElementById(字段);
        if (元素) {
            元素.value = 值;
        }
    }
    
    console.log('测试数据已填充');
}

// 开发调试用：在控制台可以调用填充测试数据()
window.填充测试数据 = 填充测试数据;