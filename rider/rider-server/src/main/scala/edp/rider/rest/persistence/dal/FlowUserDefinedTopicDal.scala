/*-
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


package edp.rider.rest.persistence.dal

import edp.rider.common.RiderLogger
import edp.rider.module.DbModule.db
import edp.rider.rest.persistence.base.BaseDalImpl
import edp.rider.rest.persistence.entities._
import edp.rider.rest.util.CommonUtils._
import slick.jdbc.MySQLProfile.api._
import slick.lifted.TableQuery

import scala.concurrent.Await

class FlowUserDefinedTopicDal(flowUdfTopicQuery: TableQuery[FlowUserDefinedTopicTable],
                              flowQuery: TableQuery[FlowTable],
                              instanceQuery: TableQuery[InstanceTable]) extends BaseDalImpl[FlowUserDefinedTopicTable, FlowUserDefinedTopic](flowUdfTopicQuery) with RiderLogger {

  // query stream_intopic table
  def checkUdfTopicExists(flowId: Long, topic: String): Boolean = {
    var exist = false
    if (Await.result(super.findByFilter(udfTopic => udfTopic.flowId === flowId && udfTopic.topic === topic), minTimeOut).nonEmpty)
      exist = true
    exist
  }

  def getUdfTopics(flowIds: Seq[Long]): Seq[FlowTopicTemp] = {
    Await.result(super.findByFilter(_.flowId inSet flowIds), minTimeOut).map(topic => FlowTopicTemp(topic.id, topic.flowId, topic.topic, topic.partitionOffsets, topic.rate))
  }
  def updateOffset(topics: Seq[UpdateTopicOffset]): Seq[Int] = {
    topics.map(topic =>
      Await.result(db.run(flowUdfTopicQuery.filter(_.id === topic.id).map(topic => (topic.partitionOffsets)).update(topic.offset)).mapTo[Int], minTimeOut))
  }


}
