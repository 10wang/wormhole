/*
 * <<
 * wormhole
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import React from 'react'
import {connect} from 'react-redux'
import { FormattedMessage } from 'react-intl'
import messages from './messages'

import DataSystemSelector from '../../components/DataSystemSelector'
import { loadDataSystemData } from '../../components/DataSystemSelector/dataSystemFunction'
import { checkInstance } from './action'
import Form from 'antd/lib/form'
import Row from 'antd/lib/row'
import Col from 'antd/lib/col'
import Tooltip from 'antd/lib/tooltip'
import Popover from 'antd/lib/popover'
import Icon from 'antd/lib/icon'
import Input from 'antd/lib/input'
const FormItem = Form.Item

export class InstanceForm extends React.Component {
  constructor (props) {
    super(props)
    this.state = { instanceDSValue: '' }
  }

  checkInstanceValidator = (rule, value = '', callback) => {
    const { onCheckInstance } = this.props
    const { instanceDSValue } = this.state
    onCheckInstance(instanceDSValue, value, res => callback(), err => callback(err))
  }
  onHandleChange = (name) => (e) => {
    switch (name) {
      case 'connectionUrl':
        this.props.onInitInstanceInputValue(e.target.value)
        break
      case 'instance':
        this.props.onInitInstanceExited(e.target.value)
        break
    }
  }

  onSourceDataSystemItemSelect = (e) => {
    this.setState({ instanceDSValue: e })
    this.props.onInitInstanceSourceDs(e)
  }

  render () {
    const { getFieldDecorator } = this.props.form
    const { instanceFormType } = this.props
    const { instanceDSValue } = this.state
    const languageText = localStorage.getItem('preferredLanguage')

    const itemStyle = {
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    }

    // edit 时，不能修改部分元素
    let disabledOrNot = false
    if (instanceFormType === 'add') {
      disabledOrNot = false
    } else if (instanceFormType === 'edit') {
      disabledOrNot = true
    }

    // help
    let questionDS = ''
    if (instanceDSValue === 'oracle' || instanceDSValue === 'mysql' ||
      instanceDSValue === 'postgresql' || instanceDSValue === 'vertica') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlOracleMsg} />
    } else if (instanceDSValue === 'es') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlEsMsg} />
    } else if (instanceDSValue === 'hbase') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlHbaseMsg} />
    } else if (instanceDSValue === 'phoenix') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlPhienixMsg} />
    } else if (instanceDSValue === 'kafka') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlKafkaMsg} />
    } else if (instanceDSValue === 'cassandra' || instanceDSValue === 'redis' ||
      instanceDSValue === 'mongodb') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlCassandraMsg} />
    } else if (instanceDSValue === 'parquet') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlParquetMsg} />
    } else if (instanceDSValue === 'kudu') {
      questionDS = <FormattedMessage {...messages.instanceModalUrlKuduMsg} />
    } else {
      questionDS = <FormattedMessage {...messages.instanceModalUrlOthersMsg} />
    }

    const connectionURLMsg = (
      <span>
        Connection URL
        <Tooltip title={<FormattedMessage {...messages.instanceHelp} />}>
          <Popover
            placement="top"
            content={<div style={{ width: '260px', height: '55px' }}>
              <p>{questionDS}</p>
            </div>}
            title={<h3><FormattedMessage {...messages.instanceHelp} /></h3>}
            trigger="click">
            <Icon type="question-circle-o" className="question-class" />
          </Popover>
        </Tooltip>
      </span>
    )

    return (
      <Form>
        <Row gutter={8}>
          <Col span={24}>
            <FormItem className="hide">
              {getFieldDecorator('id', {
                hidden: this.props.type === 'add'
              })(
                <Input />
              )}
            </FormItem>
            <FormItem label="Data System" {...itemStyle} style={{lineHeight: '36px'}}>
              {getFieldDecorator('instanceDataSystem', {
                rules: [{
                  required: true,
                  message: `${languageText === 'en' ? 'Please select Data System' : '请选择 Data System'}`
                }]
              })(
                <DataSystemSelector
                  data={loadDataSystemData()}
                  onItemSelect={this.onSourceDataSystemItemSelect}
                  dataSystemDisabled={disabledOrNot}
                />
              )}
            </FormItem>
          </Col>

          <Col span={24}>
            <FormItem label="Instance" {...itemStyle}>
              {getFieldDecorator('instance', {
                rules: [{
                  required: true,
                  message: `${languageText === 'en' ? 'Please fill in instance' : '请填写 Instance'}`
                },
                {
                  validator: this.checkInstanceValidator
                }]
              })(
                <Input
                  placeholder="Instance"
                  onChange={this.onHandleChange('instance')}
                  disabled={instanceFormType === 'edit'}
                />
              )}
            </FormItem>
          </Col>

          <Col span={24}>
            <FormItem label={connectionURLMsg} {...itemStyle}>
              {getFieldDecorator('connectionUrl', {
                rules: [{
                  required: true,
                  message: `${languageText === 'en' ? 'Please fill in connection url' : '请填写 Connection Url'}`
                }]
              })(
                <Input
                  placeholder="Connection URL"
                  onChange={this.onHandleChange('connectionUrl')}
                />
              )}
            </FormItem>
          </Col>

          <Col span={24}>
            <FormItem label="Description" {...itemStyle}>
              {getFieldDecorator('description', {})(
                <Input type="textarea" placeholder="Description" autosize={{ minRows: 3, maxRows: 8 }} />
              )}
            </FormItem>
          </Col>

        </Row>
      </Form>
    )
  }
}

InstanceForm.propTypes = {
  form: React.PropTypes.any,
  type: React.PropTypes.string,
  instanceFormType: React.PropTypes.string,
  onInitInstanceInputValue: React.PropTypes.func,
  onInitInstanceExited: React.PropTypes.func,
  onInitInstanceSourceDs: React.PropTypes.func,
  onCheckInstance: React.PropTypes.func
}

function mapDispatchToProps (dispatch) {
  return {
    onCheckInstance: (type, nsInstance, resolve, reject) => dispatch(checkInstance(type, nsInstance, resolve, reject))
  }
}

export default Form.create({wrappedComponentRef: true})(connect(null, mapDispatchToProps)(InstanceForm))
