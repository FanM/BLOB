// this is a hack to work around no enum support in hardhat test
exports.parseErrorCode = (errCodeStr, utilsContract) => {
  const regex = /'(\d+)'/i;
  const found = errCodeStr.match(regex);
  if (found !== null) {
    return utilsContract.errorCodeDescription(found[1]);
  } else {
    return errCodeStr;
  }
};
