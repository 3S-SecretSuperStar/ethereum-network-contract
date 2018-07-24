const JobManager = artifacts.require('./JobManager.sol');
const { assertFail } = require('./utils.js');
require('truffle-test-utils').init();

contract('JobManager', accounts => {

  let jm;
  const MINERAL_COMPUTE = 1;
  const MINEARL_STORAGE = 2;

  describe('submitMineral', () => {

    before(async () => {
      jm = await JobManager.deployed();
    });

    it('should fail if category is not MINERAL_COMPUTE or MINERAL_STORAGE', async () => {
      await assertFail( jm.submitMineral("test", 0) );
      await jm.submitMineral("test", MINERAL_COMPUTE);
      await jm.submitMineral("test", MINEARL_STORAGE);
      await assertFail( jm.submitMineral("test", 3) );
    });

    it('should store the Mineral in the minerals mapping', async () => {
      const mineralId = (await jm.numberOfMinerals.call()).toNumber();
      await jm.submitMineral('multiplication', MINERAL_COMPUTE);
      const mineral = await jm.minerals.call(mineralId);
      let [name, category] = mineral;
      assert.equal('multiplication', name);
      assert.equal(MINERAL_COMPUTE, category);
    });

    it('should increment numberOfMinerals', async () => {
      const numberOfMinerals = await jm.numberOfMinerals.call();
      await jm.submitMineral('addition', MINERAL_COMPUTE);
      assert.deepEqual(numberOfMinerals.add(1), await jm.numberOfMinerals.call())
    });

    it('should emit a MineralAdded event', async () => {
      const mineralId = (await jm.numberOfMinerals.call()).toNumber();
      let result = await jm.submitMineral('division', MINERAL_COMPUTE);
      assert.web3Event(result, {
        event: 'MineralAdded',
        args: {
          id: mineralId,
          name: 'division',
          category: MINERAL_COMPUTE,
        }
      });
    });

    it('should accept no name for Mineral', async () => {
      const mineralId = (await jm.numberOfMinerals.call()).toNumber();
      await jm.submitMineral("", MINERAL_COMPUTE);
      const mineral = await jm.minerals.call(mineralId);
      let [name, _] = mineral;
      assert.equal("", name);
    });
  });

  describe('job', () => {

    let expirationBlock = web3.eth.blockNumber + 1000;

    before(async () => {
      jm = await JobManager.new();
      await jm.submitMineral("multiplication", MINERAL_COMPUTE);
      await jm.submitMineral("addition", MINERAL_COMPUTE);
    });

    it('should fail if mineralId is not the id of a valid Mineral', async () => {
      await assertFail( jm.job(2, 10, expirationBlock) );
      await jm.job(0, 10, expirationBlock);
    });

    it('should fail if expiration block is not in the future', async () => {
      const blockInThePast = web3.eth.blockNumber;
      await assertFail( jm.job(0, 10, blockInThePast) );
      const presentBlock = web3.eth.blockNumber + 1;
      await assertFail( jm.job(0, 10, presentBlock) );
      const blockInTheFuture = web3.eth.blockNumber + 2;
      await jm.job(0, 10, blockInTheFuture);
    });

    it('should store the Job parameters in the jobs mapping', async () => {
      const jobId = await jm.numberOfJobs.call();
      await jm.job(1, 11, expirationBlock + 42);
      const job = await jm.jobs.call(jobId);
      const [mineralId, minPricePerMineral, expBlock] = job;
      assert.equal(1, mineralId);
      assert.equal(11, minPricePerMineral);
      assert.equal(expirationBlock + 42, expBlock);
    });

    it('should emit a JobAdded event', async () => {
      const jobId = await jm.numberOfJobs.call();
      let result = await jm.job(1, 12, expirationBlock);
      assert.web3Event(result, {
        event: 'JobAdded',
        args: {
          id: jobId.toNumber(),
          mineralId: 1,
          minPricePerMineral: 12,
          expirationBlock: expirationBlock
        }
      });
    });

    it('should increment numberOfJobs', async () => {
      const numberOfJobs = await jm.numberOfJobs.call();
      await jm.job(1, 12, expirationBlock);
      assert.deepEqual(numberOfJobs.add(1), await jm.numberOfJobs.call())
    });
  });
});
