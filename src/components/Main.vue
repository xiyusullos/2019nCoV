<template>
  <div>
    <el-row>
        <el-col :span="12">
          【国内】请选择省、市（默认显示江苏省南通）：
          <el-cascader-panel
            :options="domesticCascaderOptions"
            @change="handleChangeDomestic"
          ></el-cascader-panel>
        </el-col>
        <el-col :span="12">
          【国外】请选择洲、国（默认显示亚洲中国）：
          <el-cascader-panel
            :options="foreignCascaderOptions"
            @change="handleChangeForeign"
          ></el-cascader-panel>
        </el-col>
      </el-row>
      <div>截至 {{lastUpdateTime}} 数据统计</div>
      <div id="main" style="width: 500px; height: 400px;"></div>
  </div>
</template>

<script>
import {Row} from 'element-ui'
// import { encode, decode } from "@msgpack/msgpack"
import {compress, decompress} from 'lz-string'

var CONFIRMED_COUNT = "累计确诊";
var CURED_COUNT = "治愈";
var DEAD_COUNT = "死亡";
var SUSPECTED_COUNT = "疑似";
var REMAIN_COUNT = "现存确诊";

export default {
  name: 'Main',
  props: {
    // msg: String
  },
  data: () => {
    return {
      default: {
        provinceName: "江苏省",
        // provinceName: "全国",
        cityName: "南通",
      },

      lastUpdateTime: "--",

      db: {},
      nCoVData: [],
      _collection: null,
      provinceNames: [],

      domesticCascaderOptions: [],
      foreignCascaderOptions: [],
      test: null,
      dbUrl: "https://3.test.xy-jit.cc/DXYArea.csv",
      // dbUrl: 'db.csv',
    }
  },
  methods: {
    loadDataset: function () {
      return axios.get(this.dbUrl).then((res) => {
        // console.log(res);
        this.db = res.data;
        // var compressed = compress(res.data)
        // var cachedDb = {
        //   updateTime: moment.now(),
        //   data: compressed
        // };
        // localStorage.setItem("db", JSON.stringify(cachedDb));
      });
    },

    handleChangeDomestic: function (values) {
      var [provinceName, cityName] = values;
      this.updateFigure("亚洲", "中国", provinceName, cityName);
      console.log(values);
    },
    handleChangeForeign: function (values) {
      var [continentName, countryName] = values;
      this.updateFigure(continentName, countryName, "全国", "全省");
      console.log(values);
    },

    fetchNCoVData: function () {
      this.nCoVData = this.parseCsv(this.db);
      this._collection = collect(this.nCoVData).sortBy("updateTime");
      this.lastUpdateTime = this._collection.last().updateTime; // timestamp
      this.lastUpdateTime = this.formatTimestamp(
        this.lastUpdateTime,
        "YYYY-MM-DD HH:mm:ss"
      );
    },
    fetchProvinceNames: function () {
      this.provinceName = new Set(this.nCoVData.map((x) => x.provinceName));
    },

    prepareCascaderOptions: function () {
      var domesticCascaderOptions = [
        { value: "全国", label: "全国" },
      ].concat(
        this._collection
          .filter(
            (item, key) =>
              item.countryName === "中国" &&
              item.provinceName !== "中国" &&
              !!item.provinceName &&
              !!item.cityName
          )
          .groupBy("provinceName")
          .filter((value, key) => !!key)
          .map((items, key) => {
            return {
              value: key,
              label: key,
              children: [{ value: "全省", label: "全省" }].concat(
                items
                  .unique("cityName")
                  .map((item) => {
                    return {
                      value: item.cityName,
                      label: item.cityName,
                    };
                  })
                  .values()
                  .all()
              ),
            };
          })
          .values()
          .all()
      );
      var foreignCascaderOptions = [
        // { value: "全球", label: "全球" },
      ].concat(
        this._collection
          .filter((item, key) => !item.cityName)
          .groupBy("continentName")
          .filter((value, key) => !!key)
          .map((items, key) => {
            return {
              value: key,
              label: key,
              children: [
                // { value: "全洲", label: "全洲" },
              ].concat(
                items
                  .groupBy("countryName")
                  .filter((value, key) => !!key)
                  .map((items, key) => {
                    return {
                      value: key,
                      label: key,
                    };
                  })
                  .values()
                  .all()
              ),
            };
          })
          .values()
          .all()
      );
      // console.log(cascaderOptions);
      // this.cascaderOptions = [
      //   { value: "中国", label: "中国", children: cascaderOptions }
      // ];
      this.domesticCascaderOptions = domesticCascaderOptions;
      this.foreignCascaderOptions = foreignCascaderOptions;
    },

    // normal function
    formatTimestamp: function (timestamp, format = "YYYY-MM-DD") {
      return moment(timestamp).format(format);
    },
    parseCsv: function (
      csv,
      separator = ",",
      delimiter = "\n",
      skipHeader = true
    ) {
      var startLine = 0;
      if (skipHeader) {
        startLine = 1;
      }
      var lines = csv.split(delimiter);
      var data = [];
      for (var i = startLine; i < lines.length; i++) {
        var _ = lines[i].split(separator);
        var [
          continentName,
          continentEnglishName,
          countryName,
          countryEnglishName,
          provinceName,
          provinceEnglishName,
          province_zipCode,
          province_confirmedCount,
          province_suspectedCount,
          province_curedCount,
          province_deadCount,
          updateTime,
          cityName,
          cityEnglishName,
          city_zipCode,
          city_confirmedCount,
          city_suspectedCount,
          city_curedCount,
          city_deadCount,
        ] = _;
        if (!!provinceName) {
          data.push({
            continentName: continentName,
            countryName: countryName,
            provinceName: provinceName,
            cityName: cityName,
            province_confirmedCount: parseInt(province_confirmedCount),
            province_suspectedCount: parseInt(province_suspectedCount),
            province_curedCount: parseInt(province_curedCount),
            province_deadCount: parseInt(province_deadCount),
            city_confirmedCount: parseInt(city_confirmedCount),
            city_suspectedCount: parseInt(city_suspectedCount),
            city_curedCount: parseInt(city_curedCount),
            city_deadCount: parseInt(city_deadCount),
            updateTime: moment(
              updateTime,
              "YYYY-MM-DD HH:mm:ss.SSS"
            ).valueOf(),
          });
        }
      }

      return data;
    },
    makeSeries: function (yData) {
      var extract = function (data, name) {
        return data.map((x) => x[name]);
      };
      return [
        {
          name: CONFIRMED_COUNT,
          type: "line",
          data: extract(yData, "confirmedCount"),
        },
        {
          name: CURED_COUNT,
          type: "line",
          data: extract(yData, "curedCount"),
        },
        {
          name: DEAD_COUNT,
          type: "line",
          data: extract(yData, "deadCount"),
        },
        {
          name: SUSPECTED_COUNT,
          type: "line",
          data: extract(yData, "suspectedCount"),
        },
        {
          name: REMAIN_COUNT,
          type: "line",
          data: extract(yData, "remainCount"),
        },
      ];
    },

    // functions for echartsjs
    makeEchartOption: function (title, xData, yData) {
      // var series = [];
      return {
        title: {
          text: title,
        },
        tooltip: {},
        legend: {
          data: [
            CONFIRMED_COUNT,
            CURED_COUNT,
            DEAD_COUNT,
            SUSPECTED_COUNT,
            REMAIN_COUNT,
          ],
        },
        xAxis: {
          data: xData,
        },
        yAxis: {},
        series: this.makeSeries(yData),
      };
    },
    makeAllProvinceData: function (countryName = "中国") {
      var app = this;
      var data = app._collection
        .filter(
          (value, key) =>
            value.countryName === countryName &&
            value.provinceName !== "中国"
        )
        .groupBy((item, key) => app.formatTimestamp(item.updateTime))
        .filter((value, key) => !!key)
        .map((collection) => {
          var _grouped = collection.groupBy("provinceName");
          var confirmedCount = _grouped.sum(
            (x) => x.first().province_confirmedCount
          );
          var curedCount = _grouped.sum(
            (x) => x.first().province_curedCount
          );
          var deadCount = _grouped.sum((x) => x.first().province_deadCount);
          var suspectedCount = _grouped.sum(
            (x) => x.first().province_suspectedCount
          );
          var remainCount = confirmedCount - curedCount;
          return {
            confirmedCount: confirmedCount,
            curedCount: curedCount,
            deadCount: deadCount,
            suspectedCount: suspectedCount,
            remainCount: remainCount,
          };
        });
      this.test = data;
      return [data.keys().all(), data.values().all()];
    },
    makeProvinceData: function (provinceName = "江苏省") {
      var app = this;
      var data = collect(app.nCoVData)
        .filter((value, key) => value.provinceName === provinceName)
        .sortBy("updateTime")
        .groupBy((item, key) => app.formatTimestamp(item.updateTime))
        .filter((value, key) => !!key)
        .map((collection) => {
          var item = collection.first();
          return {
            confirmedCount: item.province_confirmedCount,
            curedCount: item.province_curedCount,
            deadCount: item.province_deadCount,
            suspectedCount: item.province_suspectedCount,
            remainCount:
              item.province_confirmedCount - item.province_curedCount,
          };
        });
      this.test = data;
      return [data.keys().all(), data.values().all()];
    },
    makeCityData: function (provinceName = "江苏省", cityName = "南通") {
      var app = this;
      var data = collect(app.nCoVData)
        .filter(
          (value, key) =>
            value.provinceName === provinceName &&
            value.cityName === cityName
        )
        .sortBy("updateTime")
        .groupBy((item, key) => app.formatTimestamp(item.updateTime))
        .filter((value, key) => !!key)
        .map((collection) => {
          var item = collection.first();
          return {
            confirmedCount: item.city_confirmedCount,
            curedCount: item.city_curedCount,
            deadCount: item.city_deadCount,
            suspectedCount: item.city_suspectedCount,
            remainCount: item.city_confirmedCount - item.city_curedCount,
          };
        });
      this.test = data;
      return [data.keys().all(), data.values().all()];
    },

    initFigure: function () {
      // 基于准备好的dom，初始化echarts实例
      this.figure = echarts.init(document.getElementById("main"));
    },
    updateFigure: function (
      continentName = "亚洲",
      countryName = "中国",
      provinceName = "江苏省",
      cityName = "南通"
    ) {
      // 指定图表的配置项和数据
      var title = "疫情：\n" + continentName + countryName + provinceName;
      var xData, yData;
      if (provinceName === "全国") {
        // title += "疫情：全国";
        [xData, yData] = this.makeAllProvinceData(countryName);
      } else if (cityName === "全省") {
        title += cityName;
        [xData, yData] = this.makeProvinceData(provinceName);
      } else {
        title += cityName;
        [xData, yData] = this.makeCityData(provinceName, cityName);
      }
      // console.log(xData, yData);
      // yData = new Set(this.nCoVData.map(x => x.confirmedCount));
      // console.log(xData, yData);
      var option = this.makeEchartOption(title, xData, yData);
      // console.log(option);

      // 使用刚指定的配置项和数据显示图表。
      this.figure.setOption(option);
    },
  },
  created: function () {},
  mounted: async function () {
    const loading = this.$loading({
      lock: true,
      text: "数据加载中...",
      spinner: "el-icon-loading",
      background: "rgba(0, 0, 0, 0.7)",
    });

    this.initFigure();

    var db = JSON.parse(localStorage.getItem('db'));
    var updateTime = !db ? 0 : db.updateTime;
    var isTwoHoursLater = moment.now() > moment(updateTime).valueOf() + 2 * 1000 * 3600// * 24 * 365
    console.log('isTwoHoursLater', isTwoHoursLater);
    if (isTwoHoursLater) {
      await this.loadDataset();
    } else {
      this.db = decompress(db.data);
    }

    // close loading
    loading.close();
    // console.log(this.db);

    this.fetchNCoVData();
    this.prepareCascaderOptions();
    this.fetchProvinceNames();
    this.updateFigure(this.default.provinceName, this.default.cityName);
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>