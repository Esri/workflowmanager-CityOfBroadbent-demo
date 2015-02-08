/*
 * Copyright 2017 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define([

  // dojo
  "dojo/_base/lang",
  "dojo/dom",
  "dojo/dom-style",

  "esri/config",

  // Workflow Manager tasks
  "esri/tasks/workflow/LOILayerTask", 
  "esri/tasks/workflow/ConfigurationTask", 
  "esri/tasks/workflow/JobTask", 
  "esri/tasks/workflow/ReportTask", 
  "esri/tasks/workflow/TokenTask", 
  "esri/tasks/workflow/WorkflowTask"
	],

function (
  lang, dom, domStyle, esriConfig,
  LOILayerTask, ConfigurationTask, JobTask, ReportTask, TokenTask, WorkflowTask
  ) {

  return {
  
    // User
    user : null,

    // Current job
    jobId: -1,
    currentJob: null,

    // Workflow Manager tasks
    serverUrl : null,
    configTask : null,
    jobTask : null,
    workflowTask : null,

    // Job properties
    jobTypes : null,

    // Workflow execution properties
    currentStep : null,

    //
    // Initialize
    //
    startup : function() {
        
      // Proxy used by esri.request
      esriConfig.proxyUrl = "proxy/proxy.ashx";

      // Configure Service URL
      this.user = "demo";
      this.serverUrl = "http://workflowsample.esri.com/arcgis/rest/services/Workflow/WMServer";
      // Initialize Workflow Manager tasks
      this.configTask = new ConfigurationTask(this.serverUrl);
      this.jobTask = new JobTask(this.serverUrl);
      this.workflowTask = new WorkflowTask(this.serverUrl);
      // Load Workflow Manager server information
      this.getServiceInfo();
    },

    //
    // Get service info for Workflow Manager
    //
    getServiceInfo: function() {
      this.configTask.getServiceInfo().then(
        function(data) {
          if (!data.error) {
            // data contains the configuration information for workflow manager server
            // for this demo, we are only interested in saving job type information
            this.jobTypes = data.jobTypes;
            console.log("Retrieved service info");
          }
        }.bind(this),
        function(error) {
          console.log("Error retrieving service info: " + error);
        }
      );
    },

    //
    // Create job
    //
    createJob: function (jobType, index) {
      var self = lang.hitch(this);

      var params = {
        jobTypeId: jobType,
        startDate: new Date(),
        dueDate: new Date(),
        ownedBy: self.user,
        assignedType: "user",
        assignedTo: self.user,
        numJobs: 1,
        user: self.user
      };

      // Job Task is called to create the job using specified parameters
      this.jobTask.createJobs(params).then(function (data) {
        console.log("Your request has been created successfully: ", data);
        this.jobId = data[0];
        dom.byId("createdJobId" + index).innerHTML = "Job " + this.jobId;
        this.getJob(this.jobId);
      }.bind(this), function (error) {
        console.log("Error creating jobs: ", error);
        dom.byId("createdJobId" + index).innerHTML = "Unable to create job(s)";
      });
    },

    //
    // Get Job Information
    //
    getJob: function (jobId) {
      var self = lang.hitch(this);

      self.jobTask.getJob(jobId).then(
        function (data) {
          self.currentJob = data;
          self.populateJobProperties();

          // Load workflow information
          self.loadWorkflow();
        },
        function (error) {
          console.log("Error creating jobs: ", error);
        }
      );
    },

    //
    // Populate UI elements with job information
    //
    populateJobProperties: function () {
      var job = this.currentJob;
      dom.byId("jobField1").innerHTML = job.name;
      dom.byId("jobField2").innerHTML = this.getFormattedField(job.description);
      dom.byId("jobField3").innerHTML = this.getFormattedField(job.assignedTo);
      dom.byId("jobField4").innerHTML = this.getFormattedDate(job.createdDate);
      dom.byId("jobField5").innerHTML = this.getFormattedDate(job.dueDate);
    },

    //
    // Load workflow
    //
    loadWorkflow: function () {
      var self = lang.hitch(this);
      // Disable execution buttons
      dom.byId("executeBtn").disabled = true;
      dom.byId("markCompleteBtn").disabled = true;

      // Steps required before executing a step or marking a step as done
      // 1. load workflow image
      // 2. load workflow step info
      // 3. check if current step can be run
      // 4. check if current step can be marked as done

      // Get workflow image using WorkflowTask
      var jobId = self.currentJob.id;
      var imageUrl = self.workflowTask.getWorkflowImageUrl(jobId);

      // If workflow image already exists, refresh it
      if ($("#workflowImg").length) {
          // Reload image
          $("#workflowImg").attr("src", imageUrl + "?timestamp=" + new Date().getTime());
      }
      // Otherwise add workflow image to the application
      else {
          var addHTML = "<img name='workflowImg' id='workflowImg' src='" + imageUrl + "' >";
          $("#workflowContents").append(addHTML);
      }

      // Get current steps for workflow
      self.workflowTask.getCurrentSteps(jobId).then(
        function (steps) {
          var currentStep = steps[0];
          self.currentStep = currentStep;       // Current step
          self.checkCanRunStep(currentStep);    // Check if step can be run
          self.checkCanMarkStepAsDone(currentStep); // Check if step can be marked as complete
        },
        function (error) {
          console.log("Error retrieving current steps: " + error);
        });
      // show div element
      self.showWorkflow();
    },

    //
    // Check if step can be run
    //
    checkCanRunStep: function (step) {
      var self = lang.hitch(this);

      // If the job isn't assigned to the current user, we can't execute and don't even need to go to the server
      if (this.currentJob.assignedTo != this.user || this.currentJob.assignedType != "user")
        return;

      var params = {
        jobId: self.currentJob.id,
        stepId: step.id,
        user: self.user
      };

      // Use the WorkflowTask to check if a step can be run
      self.workflowTask.canRunStep(params).then(
        function (stepStatus) {
          // User can execute the step if
          // 1. Step status is set to can-run
          // 2. Step is not a procedural step OR it is a procedural step set to autoRun
          var canRun = (stepStatus == "can-run");
          self.canExecuteStep = canRun && 
            (step.stepType.executionType != 'procedural' || (step.autoRun && step.stepType.executionType == 'procedural'));
          dom.byId("executeBtn").disabled = !(canExecuteStep);
          self.showWorkflow();
        },
        function (error) {
          self.showError("Workflow Error", error);
          dom.byId("executeBtn").disabled = true;
          self.showWorkflow();
        });
    },

    //
    // Check if step can be marked as done
    //
    checkCanMarkStepAsDone: function (step) {
      var canMarkStepAsDone = (step.canSkip || step.hasBeenExecuted
        || step.stepType.executionType == 'procedural')
        && this.currentJob.assignedTo == this.user && this.currentJob.assignedType == "user";

      // Enable the mark as done button as needed
      dom.byId("markCompleteBtn").disabled = !(canMarkStepAsDone);
      this.showWorkflow();
    },

    //
    // Execute step
    //
    executeStep : function () {
      var self = lang.hitch(this);
      self.hideWorkflow();

      var params = {
        jobId: self.currentJob.id,
        stepIds: [self.currentStep.id],
        auto: false,
        user: self.currentJob.assignedTo
      };
      self.workflowTask.executeSteps(params).then(
        function (data) {
          // Check for any execution errors
          if (data != null && data.length > 0) {
            var result = data[0];
            if (result.threwError) {
              console.log("Workflow Error" + result.errorDescription);
            }
          }
          // Reload job
          self.getJob(self.currentJob.id);
        },
        function (error) {
          console.log("Workflow Error" + error);
        }
      );
    },

    //
    // Mark step as complete
    //
    markAsComplete : function() {
      var self = lang.hitch(this);
      self.hideWorkflow();
      
      var stepIds=[self.currentStep.id];
      var params = {
        jobId: self.currentJob.id,
        stepIds: stepIds,
        user: self.currentJob.assignedTo
      };
      self.workflowTask.markStepsAsDone(params).then(
        function (data) {
          // Reload job
          self.getJob(self.currentJob.id);
        },
        function (error) {
          console.log("Workflow Error" + error);
        }
      );
    },

    //---------------------------------Helper functions----------------------------------

    //
    // Return the name of the job type give the job type ID.
    //
    getJobTypeName: function (jobTypeId) {
      var self = lang.hitch(this);
      var retVal = "";
      $.each(self.jobTypes, function (i, item) {
        if (item.id == jobTypeId) {
          retVal = item.name;
          return retVal;
        }
      });
      return retVal;
    },

    //
    // Show workflow information
    //
    showWorkflow : function () {
      $("#workflowContents").show();
      $("#workflowPropsLoading").hide();
    },
    //
    // Hide workflow information
    //
    hideWorkflow : function () {
      $("#workflowContents").hide();
      $("#workflowPropsLoading").show();
    },

    //
    // Format field helper function
    //
    getFormattedField : function (field) {
      if (field != null && field.length != 0)
        return field;
      else
        return "N/A";
    },

    //
    // Format date helper function
    //
    getFormattedDate : function(utcDate) {
      if (utcDate == null)
          return "None";
      var date = new Date(utcDate);
      var retDate = date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
      return retDate;
    }
  };
});
