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
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createStructuredSelector } from 'reselect'
import Helmet from 'react-helmet'
import { FormattedMessage } from 'react-intl'
import messages from './messages'

import DBForm from './DBForm'
import Table from 'antd/lib/table'
import Button from 'antd/lib/button'
import Icon from 'antd/lib/icon'
import Tooltip from 'antd/lib/tooltip'
import Modal from 'antd/lib/modal'
import message from 'antd/lib/message'
import Input from 'antd/lib/input'
import Popover from 'antd/lib/popover'
import Popconfirm from 'antd/lib/popconfirm'
import DatePicker from 'antd/lib/date-picker'
const { RangePicker } = DatePicker

import { changeLocale } from '../../containers/LanguageProvider/actions'
import {
  loadDatabases,
  addDatabase,
  editDatabase,
  loadDatabasesInstance,
  loadSingleDatabase,
  deleteDB
} from './action'
import {
  selectDatabases,
  selectError,
  selectModalLoading,
  selectDbUrlValue
} from './selectors'

import { operateLanguageText } from '../../utils/util'
import { onConfigValue } from './dbFunction'
import { filterDataSystemData } from '../../components/DataSystemSelector/dataSystemFunction'

export class DataBase extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      formVisible: false,
      formType: 'add',
      refreshDbLoading: false,
      refreshDbText: 'Refresh',
      showDBDetails: {},

      currentDatabases: [],
      originDatabases: [],

      filteredInfo: null,
      sortedInfo: null,

      searchTextDBInstance: '',
      filterDropdownVisibleDBInstance: false,
      searchTextDatabase: '',
      filterDropdownVisibleDatabase: false,
      searchTextConnUrl: '',
      filterDropdownVisibleConnUrl: false,
      filterDatepickerShown: false,
      startTimeText: '',
      endTimeText: '',
      createStartTimeText: '',
      createEndTimeText: '',
      filterDropdownVisibleCreateTime: false,
      updateStartTimeText: '',
      updateEndTimeText: '',
      filterDropdownVisibleUpdateTime: false,

      columnNameText: '',
      valueText: '',
      visibleBool: false,
      startTimeTextState: '',
      endTimeTextState: '',
      paginationInfo: null,

      editDatabaseData: {},
      databaseDSType: '',
      queryConnUrl: ''
    }
  }

  componentWillMount () {
    this.refreshDatabase()
    this.props.onChangeLanguage(localStorage.getItem('preferredLanguage'))
  }

  componentWillReceiveProps (props) {
    if (props.databases) {
      const originDatabases = props.databases.map(s => {
        s.key = s.id
        s.visible = false
        return s
      })
      this.setState({ originDatabases: originDatabases.slice() })

      this.state.columnNameText === ''
        ? this.setState({ currentDatabases: originDatabases.slice() })
        : this.searchOperater()
    }
  }

  searchOperater () {
    const { columnNameText, valueText, visibleBool } = this.state
    const { startTimeTextState, endTimeTextState } = this.state

    if (columnNameText !== '') {
      this.onSearch(columnNameText, valueText, visibleBool)()

      if (columnNameText === 'createTime' || columnNameText === 'updateTime') {
        this.onRangeTimeSearch(columnNameText, startTimeTextState, endTimeTextState, visibleBool)()
      }
    }
  }

  refreshDatabase = () => {
    this.setState({
      refreshDbLoading: true,
      refreshDbText: 'Refreshing'
    })
    this.props.onLoadDatabases(() => this.refreshDbState())
  }

  refreshDbState () {
    this.setState({
      refreshDbLoading: false,
      refreshDbText: 'Refresh'
    })

    const { paginationInfo, filteredInfo, sortedInfo } = this.state
    this.handleDatabaseChange(paginationInfo, filteredInfo, sortedInfo)
  }

  showAddDB = () => {
    this.setState({
      formVisible: true,
      formType: 'add'
    })
  }

  // 回显
  showEditDB = (database) => (e) => {
    this.props.onLoadSingleDatabase(database.id, ({
      active, config, connUrl, createBy, createTime, desc, id, nsDatabase, nsInstance,
      nsInstanceId, nsSys, partitions, pwd, updateBy, updateTime, user
    }) => {
      this.setState({
        formVisible: true,
        formType: 'edit',
        queryConnUrl: connUrl,
        editDatabaseData: {
          active: active,
          createBy: createBy,
          createTime: createTime,
          id: id,
          nsInstanceId: nsInstanceId,
          updateBy: updateBy,
          updateTime: updateTime,
          connectionUrl: connUrl
        }
      }, () => {
        if (nsSys === 'oracle' ||
          nsSys === 'mysql' ||
          nsSys === 'postgresql' ||
          nsSys === 'vertica'
        ) {
          this.dBForm.setFieldsValue({
            userRequired: user,
            passwordRequired: pwd
          })
        } else {
          this.dBForm.setFieldsValue({
            user: user,
            password: pwd
          })
        }

        const conFinal = (config.includes(',') && config.includes('='))
          ? config.replace(/,/g, '\n')
          : config

        this.dBForm.setFieldsValue({
          dataBaseDataSystem: nsSys,
          instance: nsInstance,
          nsDatabase: nsDatabase,
          config: conFinal,
          description: desc,
          partition: partitions
        })
      })
    })
  }

  // 点击遮罩层或右上角叉或取消按钮的回调
  hideForm = () => this.setState({ formVisible: false })

  // Modal 完全关闭后的回调
  resetModal = () => this.dBForm.resetFields()

  onModalOk = () => {
    const { formType, editDatabaseData } = this.state
    const languageText = localStorage.getItem('preferredLanguage')
    const createFormat = languageText === 'en' ? 'Database is created successfully!' : 'Database 新建成功！'
    const modifyFormat = languageText === 'en' ? 'Database is modified successfully!' : 'Database 修改成功！'
    const oracleErrorFormat = languageText === 'en' ? 'When you select Oracle, "service_name" should be contained in Config.' : 'Oracle时, 必须包含"service_name"字段'

    this.dBForm.validateFieldsAndScroll((err, values) => {
      if (!err) {
        switch (formType) {
          case 'add':
            if (values.dataBaseDataSystem === 'oracle') {
              if (values.config === undefined || !values.config.includes('service_name')) {
                this.dBForm.setFields({
                  config: {
                    value: values.config,
                    errors: [new Error(oracleErrorFormat)]
                  }
                })
              } else {
                const addValues = {
                  nsDatabase: values.nsDatabase,
                  desc: values.description === undefined ? '' : values.description,
                  nsInstanceId: Number(values.instance),
                  user: values.userRequired,
                  pwd: values.passwordRequired,
                  partitions: 0,
                  config: onConfigValue(values.config)
                }
                this.props.onAddDatabase(addValues, () => {
                  this.hideForm()
                  message.success(createFormat, 3)
                }, (result) => {
                  message.error(result, 3)
                })
              }
            } else {
              let valuesUser = ''
              let valuesPwd = ''
              let valuesConfig = ''
              if (values.dataBaseDataSystem === 'kafka') {
                valuesUser = ''
                valuesPwd = ''
                valuesConfig = values.config
              } else if (values.dataBaseDataSystem === 'mysql' ||
                values.dataBaseDataSystem === 'postgresql' ||
                values.dataBaseDataSystem === 'vertica') {
                valuesUser = values.userRequired
                valuesPwd = values.passwordRequired
                valuesConfig = values.config
              } else {
                if (values.user === undefined) {
                  valuesUser = ''
                } else if (values.password === undefined) {
                  valuesPwd = ''
                } else if (values.config === undefined) {
                  valuesConfig = ''
                } else {
                  valuesUser = values.user
                  valuesPwd = values.password
                  valuesConfig = values.config
                }
              }

              const addValues = {
                nsDatabase: values.nsDatabase,
                desc: values.description === undefined ? '' : values.description,
                nsInstanceId: Number(values.instance),
                user: valuesUser,
                pwd: valuesPwd,
                partitions: values.dataBaseDataSystem === 'kafka' ? Number(values.partition) : 0,
                config: valuesConfig === '' ? '' : onConfigValue(valuesConfig)
              }

              this.props.onAddDatabase(addValues, () => {
                this.hideForm()
                message.success(createFormat, 3)
              }, (result) => {
                message.error(result, 3)
              })
            }
            break
          case 'edit':
            if (values.dataBaseDataSystem === 'oracle') {
              if (values.config === undefined || !values.config.includes('service_name')) {
                this.dBForm.setFields({
                  config: {
                    value: values.config,
                    errors: [new Error(oracleErrorFormat)]
                  }
                })
              } else {
                const editValues = {
                  user: values.userRequired,
                  pwd: values.passwordRequired,
                  config: onConfigValue(values.config),
                  desc: values.description,
                  nsDatabase: values.nsDatabase,
                  partitions: 0
                }

                this.props.onEditDatabase(Object.assign(editDatabaseData, editValues), () => {
                  this.hideForm()
                  message.success(modifyFormat, 3)
                }, (result) => {
                  message.error(result, 3)
                })
              }
            } else {
              let editUser = ''
              let editPwd = ''
              if (values.dataBaseDataSystem === 'kafka') {
                editUser = ''
                editPwd = ''
              } else if (values.dataBaseDataSystem === 'mysql' ||
                values.dataBaseDataSystem === 'postgresql' ||
                values.dataBaseDataSystem === 'vertica') {
                editUser = values.userRequired
                editPwd = values.passwordRequired
              } else {
                editUser = values.user
                editPwd = values.password
              }

              const editValues = {
                user: editUser,
                pwd: editPwd,
                config: onConfigValue(values.config),
                desc: values.description,
                nsDatabase: values.nsDatabase,
                partitions: values.dataBaseDataSystem === 'kafka' ? values.partition : 0
              }

              this.props.onEditDatabase(Object.assign(editDatabaseData, editValues), () => {
                this.hideForm()
                message.success(modifyFormat, 3)
              }, (result) => {
                message.error(result, 3)
              })
            }
            break
        }
      }
    })
  }

  onSearch = (columnName, value, visible) => () => {
    const reg = new RegExp(this.state[value], 'gi')

    this.setState({
      filteredInfo: {nsSys: []}
    }, () => {
      this.setState({
        [visible]: false,
        columnNameText: columnName,
        valueText: value,
        visibleBool: visible,
        currentDatabases: this.state.originDatabases.map((record) => {
          const match = String(record[columnName]).match(reg)
          if (!match) {
            return null
          }
          return {
            ...record,
            [`${columnName}Origin`]: record[columnName],
            [columnName]: (
              <span>
                {String(record[columnName]).split(reg).map((text, i) => (
                  i > 0 ? [<span className="highlight">{match[0]}</span>, text] : text
                ))}
              </span>
            )
          }
        }).filter(record => !!record)
      })
    })
  }

  handleDatabaseChange = (pagination, filters, sorter) => {
    if (filters) {
      if (filters.nsSys) {
        if (filters.nsSys.length !== 0) {
          this.onSearch('', '', false)()
        }
      }
    }
    this.setState({
      filteredInfo: filters,
      sortedInfo: sorter,
      paginationInfo: pagination
    })
  }

  onRangeIdSearch = (columnName, startText, endText, visible) => () => {
    this.setState({
      [visible]: false,
      currentDatabases: this.state.originDatabases.map((record) => {
        const match = record[columnName]
        if ((match < parseInt(this.state[startText])) || (match > parseInt(this.state[endText]))) {
          return null
        }
        return record
      }).filter(record => !!record),
      filteredInfo: this.state[startText] || this.state[endText] ? { id: [0] } : { id: [] }
    })
  }

  onInputChange = (value) => (e) => this.setState({ [value]: e.target.value })

  /**
   *  新增时，不同 data system 显示不同 Instance 下拉框内容
   * */
  onInitDatabaseUrlValue = (value) => {
    this.props.onLoadDatabasesInstance(value, () => {
      this.setState({ databaseDSType: value })
      // dbForm placeholder
      this.dBForm.setFieldsValue({
        connectionUrl: '',
        instance: undefined,
        nsDatabase: '',
        user: '',
        password: '',
        userRequired: '',
        passwordRequired: '',
        partition: '',
        config: '',
        description: ''
      })
    })
  }

  // 当存在 service_name 时，报错提示去掉
  onInitDatabaseConfigValue = (value) => {
    const formValues = this.dBForm.getFieldsValue()
    if (formValues.dataBaseDataSystem === 'oracle') {
      if (value.includes('service_name')) {
        this.dBForm.setFieldsValue({ config: value })
      }
    }
  }

  handleEndOpenChange = (status) => this.setState({ filterDatepickerShown: status })

  onRangeTimeChange = (value, dateString) => {
    this.setState({
      startTimeText: dateString[0],
      endTimeText: dateString[1]
    })
  }

  onRangeTimeSearch = (columnName, startTimeText, endTimeText, visible) => () => {
    const startSearchTime = (new Date(this.state.startTimeText)).getTime()
    const endSearchTime = (new Date(this.state.endTimeText)).getTime()

    let startOrEnd = ''
    if (columnName === 'createTime') {
      startOrEnd = startSearchTime || endSearchTime ? { createTime: [0] } : { createTime: [] }
    } else if (columnName === 'updateTime') {
      startOrEnd = startSearchTime || endSearchTime ? { updateTime: [0] } : { updateTime: [] }
    }

    this.setState({
      filteredInfo: {nsSys: []}
    }, () => {
      this.setState({
        [visible]: false,
        columnNameText: columnName,
        startTimeTextState: startTimeText,
        endTimeTextState: endTimeText,
        visibleBool: visible,
        currentDatabases: this.state.originDatabases.map((record) => {
          const match = (new Date(record[columnName])).getTime()
          if ((match < startSearchTime) || (match > endSearchTime)) {
            return null
          }
          return {
            ...record,
            [columnName]: (
              this.state.startTimeText === ''
                ? <span>{record[columnName]}</span>
                : <span className="highlight">{record[columnName]}</span>
            )
          }
        }).filter(record => !!record),
        filteredInfo: startOrEnd
      })
    })
  }

  handleVisibleChangeDatabase = (record) => (visible) => {
    if (visible) {
      this.setState({
        visible
      }, () => {
        this.props.onLoadSingleDatabase(record.id, (result) => this.setState({ showDBDetails: result }))
      })
    }
  }

  deleteDBBtn = (record) => (e) => {
    this.props.onDeleteDB(record.id, () => {
      message.success(operateLanguageText('success', 'delete'), 3)
    }, (result) => {
      message.error(`${operateLanguageText('fail', 'delete')} ${result}`, 5)
    })
  }

  render () {
    const { formType, formVisible, queryConnUrl, currentDatabases,
      refreshDbLoading, refreshDbText, showDBDetails } = this.state
    const { modalLoading, dbUrlValue } = this.props

    let { sortedInfo, filteredInfo } = this.state
    sortedInfo = sortedInfo || {}
    filteredInfo = filteredInfo || {}

    const columns = [{
      title: 'Data System',
      dataIndex: 'nsSys',
      key: 'nsSys',
      sorter: (a, b) => {
        if (typeof a.nsSys === 'object') {
          return a.nsSysOrigin < b.nsSysOrigin ? -1 : 1
        } else {
          return a.nsSys < b.nsSys ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'nsSys' && sortedInfo.order,
      filters: filterDataSystemData(),
      filteredValue: filteredInfo.nsSys,
      onFilter: (value, record) => record.nsSys.includes(value)
    }, {
      title: 'Instance',
      dataIndex: 'nsInstance',
      key: 'nsInstance',
      sorter: (a, b) => {
        if (typeof a.nsInstance === 'object') {
          return a.nsInstanceOrigin < b.nsInstanceOrigin ? -1 : 1
        } else {
          return a.nsInstance < b.nsInstance ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'nsInstance' && sortedInfo.order,
      filterDropdown: (
        <div className="custom-filter-dropdown">
          <Input
            ref={ele => { this.searchInput = ele }}
            placeholder="Instance"
            value={this.state.searchTextDBInstance}
            onChange={this.onInputChange('searchTextDBInstance')}
            onPressEnter={this.onSearch('nsInstance', 'searchTextDBInstance', 'filterDropdownVisibleDBInstance')}
          />
          <Button type="primary" onClick={this.onSearch('nsInstance', 'searchTextDBInstance', 'filterDropdownVisibleDBInstance')}>Search</Button>
        </div>
      ),
      filterDropdownVisible: this.state.filterDropdownVisibleDBInstance,
      onFilterDropdownVisibleChange: visible => this.setState({
        filterDropdownVisibleDBInstance: visible
      }, () => this.searchInput.focus())
    }, {
      title: 'Database',
      dataIndex: 'nsDatabase',
      key: 'nsDatabase',
      sorter: (a, b) => {
        if (typeof a.nsDatabase === 'object') {
          return a.nsDatabaseOrigin < b.nsDatabaseOrigin ? -1 : 1
        } else {
          return a.nsDatabase < b.nsDatabase ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'nsDatabase' && sortedInfo.order,
      filterDropdown: (
        <div className="custom-filter-dropdown">
          <Input
            ref={ele => { this.searchInput = ele }}
            placeholder="Database"
            value={this.state.searchTextDatabase}
            onChange={this.onInputChange('searchTextDatabase')}
            onPressEnter={this.onSearch('nsDatabase', 'searchTextDatabase', 'filterDropdownVisibleDatabase')}
          />
          <Button type="primary" onClick={this.onSearch('nsDatabase', 'searchTextDatabase', 'filterDropdownVisibleDatabase')}>Search</Button>
        </div>
      ),
      filterDropdownVisible: this.state.filterDropdownVisibleDatabase,
      onFilterDropdownVisibleChange: visible => this.setState({
        filterDropdownVisibleDatabase: visible
      }, () => this.searchInput.focus())
    }, {
      title: 'Connection URL',
      dataIndex: 'connUrl',
      key: 'connUrl',
      sorter: (a, b) => {
        if (typeof a.connUrl === 'object') {
          return a.connUrlOrigin < b.connUrlOrigin ? -1 : 1
        } else {
          return a.connUrl < b.connUrl ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'connUrl' && sortedInfo.order,
      filterDropdown: (
        <div className="custom-filter-dropdown">
          <Input
            ref={ele => { this.searchInput = ele }}
            placeholder="URL"
            value={this.state.searchTextConnUrl}
            onChange={this.onInputChange('searchTextConnUrl')}
            onPressEnter={this.onSearch('connUrl', 'searchTextConnUrl', 'filterDropdownVisibleConnUrl')}
          />
          <Button type="primary" onClick={this.onSearch('connUrl', 'searchTextConnUrl', 'filterDropdownVisibleConnUrl')}>Search</Button>
        </div>
      ),
      filterDropdownVisible: this.state.filterDropdownVisibleConnUrl,
      onFilterDropdownVisibleChange: visible => this.setState({
        filterDropdownVisibleConnUrl: visible
      }, () => this.searchInput.focus())
    }, {
      title: 'Create Time',
      dataIndex: 'createTime',
      key: 'createTime',
      sorter: (a, b) => {
        if (typeof a.createTime === 'object') {
          return a.createTimeOrigin < b.createTimeOrigin ? -1 : 1
        } else {
          return a.createTime < b.createTime ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'createTime' && sortedInfo.order,
      filterDropdown: (
        <div className="custom-filter-dropdown-style">
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['Start', 'End']}
            onOpenChange={this.handleEndOpenChange}
            onChange={this.onRangeTimeChange}
            onPressEnter={this.onRangeTimeSearch('createTime', 'createStartTimeText', 'createEndTimeText', 'filterDropdownVisibleCreateTime')}
          />
          <Button type="primary" className="rangeFilter" onClick={this.onRangeTimeSearch('createTime', 'createStartTimeText', 'createEndTimeText', 'filterDropdownVisibleCreateTime')}>Search</Button>
        </div>
      ),
      filterDropdownVisible: this.state.filterDropdownVisibleCreateTime,
      onFilterDropdownVisibleChange: visible => {
        if (!this.state.filterDatepickerShown) {
          this.setState({ filterDropdownVisibleCreateTime: visible })
        }
      }
    }, {
      title: 'Update Time',
      dataIndex: 'updateTime',
      key: 'updateTime',
      sorter: (a, b) => {
        if (typeof a.updateTime === 'object') {
          return a.updateTimeOrigin < b.updateTimeOrigin ? -1 : 1
        } else {
          return a.updateTime < b.updateTime ? -1 : 1
        }
      },
      sortOrder: sortedInfo.columnKey === 'updateTime' && sortedInfo.order,
      filterDropdown: (
        <div className="custom-filter-dropdown-style">
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={['Start', 'End']}
            onOpenChange={this.handleEndOpenChange}
            onChange={this.onRangeTimeChange}
            onPressEnter={this.onRangeTimeSearch('updateTime', 'updateStartTimeText', 'updateEndTimeText', 'filterDropdownVisibleUpdateTime')}
          />
          <Button type="primary" className="rangeFilter" onClick={this.onRangeTimeSearch('updateTime', 'updateStartTimeText', 'createEndTimeText', 'filterDropdownVisibleUpdateTime')}>Search</Button>
        </div>
      ),
      filterDropdownVisible: this.state.filterDropdownVisibleUpdateTime,
      onFilterDropdownVisibleChange: visible => {
        if (!this.state.filterDatepickerShown) {
          this.setState({ filterDropdownVisibleUpdateTime: visible })
        }
      }
    }, {
      title: 'Action',
      key: 'action',
      className: 'text-align-center',
      render: (text, record) => {
        const nsSysKafka = record.nsSys === 'kafka'
          ? ''
          : (
            <div>
              <p><strong>User：</strong>{showDBDetails.user}</p>
              <p><strong>Password：</strong>{showDBDetails.pwd}</p>
            </div>
          )

        return (
          <span className="ant-table-action-column">
            <Tooltip title={<FormattedMessage {...messages.dbTableViewDetail} />}>
              <Popover
                placement="left"
                content={
                  <div>
                    <p><strong>Description：</strong>{showDBDetails.desc}</p>
                    <p><strong>Config：</strong>{showDBDetails.config}</p>
                    <p><strong>Partitions：</strong>{showDBDetails.partitions}</p>
                    {nsSysKafka}
                  </div>
                }
                title={<h3><FormattedMessage {...messages.dbTableDetail} /></h3>}
                trigger="click"
                onVisibleChange={this.handleVisibleChangeDatabase(record)}>
                <Button icon="file-text" shape="circle" type="ghost"></Button>
              </Popover>
            </Tooltip>

            <Tooltip title={<FormattedMessage {...messages.dbTableModify} />}>
              <Button icon="edit" shape="circle" type="ghost" onClick={this.showEditDB(record)} />
            </Tooltip>
            {
              localStorage.getItem('loginRoleType') === 'admin'
                ? (
                  <Popconfirm placement="bottom" title={<FormattedMessage {...messages.dbTableSureDelete} />} okText="Yes" cancelText="No" onConfirm={this.deleteDBBtn(record)}>
                    <Tooltip title={<FormattedMessage {...messages.dbTableDelete} />}>
                      <Button icon="delete" shape="circle" type="ghost"></Button>
                    </Tooltip>
                  </Popconfirm>
                )
                : ''
            }
          </span>
        )
      }
    }]

    const pagination = {
      showSizeChanger: true,
      onChange: (current) => {
        console.log('current', current)
      }
    }

    const modalTitle = formType === 'add'
      ? <FormattedMessage {...messages.dbModalCreate} />
      : <FormattedMessage {...messages.dbModalModify} />

    return (
      <div>
        <Helmet title="Database" />
        <div className="ri-workbench-table ri-common-block">
          <h3 className="ri-common-block-title">
            <Icon type="bars" /> DataBase <FormattedMessage {...messages.dbTableList} />
          </h3>
          <div className="ri-common-block-tools">
            <Button icon="plus" type="primary" onClick={this.showAddDB}>
              <FormattedMessage {...messages.dbTableCreate} />
            </Button>
            <Button icon="reload" type="ghost" className="refresh-button-style" loading={refreshDbLoading} onClick={this.refreshDatabase}>{refreshDbText}</Button>
          </div>
          <Table
            dataSource={currentDatabases}
            columns={columns}
            onChange={this.handleDatabaseChange}
            pagination={pagination}
            className="ri-workbench-table-container"
            bordered>
          </Table>
        </div>
        <Modal
          title={modalTitle}
          okText="保存"
          wrapClassName="db-form-style"
          visible={formVisible}
          onCancel={this.hideForm}
          afterClose={this.resetModal}
          footer={[
            <Button
              key="cancel"
              size="large"
              type="ghost"
              onClick={this.hideForm}
            >
              <FormattedMessage {...messages.dbModalCancel} />
            </Button>,
            <Button
              key="submit"
              size="large"
              type="primary"
              loading={modalLoading}
              onClick={this.onModalOk}
            >
              <FormattedMessage {...messages.dbModalSave} />
            </Button>
          ]}
        >
          <DBForm
            databaseFormType={formType}
            queryConnUrl={queryConnUrl}
            onInitDatabaseUrlValue={this.onInitDatabaseUrlValue}
            databaseUrlValue={dbUrlValue}
            onInitDatabaseConfigValue={this.onInitDatabaseConfigValue}
            ref={(f) => { this.dBForm = f }}
          />
        </Modal>
      </div>
    )
  }
}

DataBase.propTypes = {
  modalLoading: PropTypes.bool,
  dbUrlValue: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.array
  ]),
  onLoadDatabases: PropTypes.func,
  onAddDatabase: PropTypes.func,
  onEditDatabase: PropTypes.func,
  onLoadDatabasesInstance: PropTypes.func,
  onLoadSingleDatabase: PropTypes.func,
  onDeleteDB: PropTypes.func,
  onChangeLanguage: PropTypes.func
}

export function mapDispatchToProps (dispatch) {
  return {
    onLoadDatabases: (resolve) => dispatch(loadDatabases(resolve)),
    onAddDatabase: (database, resolve, reject) => dispatch(addDatabase(database, resolve, reject)),
    onEditDatabase: (database, resolve, reject) => dispatch(editDatabase(database, resolve, reject)),
    onLoadDatabasesInstance: (value, resolve) => dispatch(loadDatabasesInstance(value, resolve)),
    onLoadSingleDatabase: (databaseId, resolve) => dispatch(loadSingleDatabase(databaseId, resolve)),
    onDeleteDB: (databaseId, resolve, reject) => dispatch(deleteDB(databaseId, resolve, reject)),
    onChangeLanguage: (type) => dispatch(changeLocale(type))
  }
}

const mapStateToProps = createStructuredSelector({
  databases: selectDatabases(),
  error: selectError(),
  modalLoading: selectModalLoading(),
  dbUrlValue: selectDbUrlValue()
})

export default connect(mapStateToProps, mapDispatchToProps)(DataBase)
