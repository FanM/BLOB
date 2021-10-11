FROM amazon/aws-lambda-nodejs:14
# Alternatively, you can pull the base image from Docker Hub: amazon/aws-lambda-nodejs:12

# Install NPM dependencies for function
# RUN curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo && \
#     curl --silent --location https://rpm.nodesource.com/setup_14.x | bash - && \
#     yum install -y git yarn
COPY docker/package.json ${LAMBDA_TASK_ROOT}
COPY docker/hardhat-core/ ${LAMBDA_TASK_ROOT}/hardhat-core
#RUN cd ${LAMBDA_TASK_ROOT}/hardhat-all/packages/hardhat-core && yarn && npm run build &&\
#    cd ${LAMBDA_TASK_ROOT} && npm i
RUN yum install -y git && npm i

# Assumes your function is named "app.js", and there is a package.json file in the app directory
COPY docker/hardhat.config.js docker/cronjob.js secrets.json ${LAMBDA_TASK_ROOT}/
ADD client/src/blob_contracts.json client/src/contracts/contracts/ ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "cronjob.handler" ]
