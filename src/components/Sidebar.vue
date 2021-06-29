<template>
<div>
  <button class="btn switch-btn btn-main" @click.prevent="switchOpen" :class="{'open':open,'close':!open}">
    <i class="fas fa-chevron-left" v-if="open"></i>
    <i class="fas fa-chevron-right" v-else></i>
  </button>
  <nav id="sidebarMenu" class="bg-main sidebar" :class="{'open':open,'close':!open}">
     <div class="position-sticky">
      <h3 class="text-white mb-0 px-3 pt-3">
        <strong>台灣豬標章地圖</strong>
      </h3>
      <div class="search p-3">
        <div class="city-select row g-0">
          <div class="col-6 pe-1 mb-3">
            <select name="county" id="county" class="form-select" :value="selectedCounty"
            @input="$emit('update:selectedCounty', $event.target.value)"
            @change="switchCities">
              <option :value="item" v-for="item in countyList" :key="item">{{ item }}</option>
            </select>
          </div>
          <div class="col-6">
            <select name="area" id="area" class="form-select" :value="selectedArea"
            @input="$emit('update:selectedArea', $event.target.value)" @change="regetRegionData">
              <option value="" disabled>請選擇</option>
              <option :value="item.name" v-for="item in areaList" :key="item.zip">{{ item.name }}</option>
            </select>
          </div>
          <div class="col-12 d-flex justify-content-around align-items-center">
            <button class="btn btn-third me-2 p-1" @click.prevent="switchType('全部')">全部</button>
            <button class="btn btn-use me-2 p-1" @click.prevent="switchType('餐飲')">餐飲</button>
            <button class="btn btn-warning me-2 p-1" @click.prevent="switchType('販售')">販售</button>
            <button class="btn btn-secondary me-2 p-1" @click.prevent="switchType('其他')">其他</button>
          </div>
        </div>
      </div>
      <div class="content bg-light">
        <div class="list-group rounded-0 list-group-flush" v-if="porkData.length>0">
          <a href="#" @click.prevent = "OpenPopup($event, item.badge_code)" class="list-group-item list-group-item-action" v-for="item in porkData" :key="item.badge_code">
          <div class="d-flex justify-content-between align-items-center">
            <strong>{{item.market_name }}</strong>
            <div>
              <span class="badge rounded-pill bg-use" v-if="item.type === '餐飲'">{{ item.type }}</span>
              <span class="badge rounded-pill bg-warning" v-else-if="item.type === '販售'">{{ item.type }}</span>
              <span class="badge rounded-pill bg-third" v-else>其他</span>
            </div>
          </div>
          <small>{{ item.addr }}</small>
          <div class="d-flex justify-content-between align-items-center">
            <small v-if="item.business_hours && item.business_hurs_end && item.business_week" :class="{'text-success': transformOpen (item.business_hours, item.business_hurs_end, transformBusinessWeek(item.business_week)),'text-third': !transformOpen (item.business_hours, item.business_hurs_end, transformBusinessWeek(item.business_week))}">
              <strong>{{ transformOpen (item.business_hours, item.business_hurs_end, transformBusinessWeek(item.business_week))?'營業中':'尚未營業' }}
              </strong>
            </small>
            <small v-else class="text-third">尚無資料</small>
            <div class="dropdown">
              <button class="border dropdown-toggle btn-sm" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
               營業時間
              </button>
              <ul class="dropdown-menu dropdown-menu-sm" aria-labelledby="dropdownMenuButton">
                <li class="dropdown-item" v-for="i in transformBusinessWeek(item.business_week)" :key="i">
                  {{ i }} {{ item.business_hours }} ~ {{ item.business_hurs_end }}
                </li>
              </ul>
            </div>
          </div>
          </a>
        </div>
        <div class="list-group rounded-0 list-group-flush py-3 px-2" v-else>
        這邊的商家還沒有申請標章喔
        </div>
      </div>
    </div>
  </nav>
  </div>
</template>

<script>
import * as moment from 'moment'
export default {
  name: 'Sidebar',
  props: {
    countyList: Array,
    areaList: Array,
    selectedCounty: String,
    selectedArea: String,
    porkData: Array
  },
  data () {
    return {
      open: false,
      type: '全部'
    }
  },
  methods: {
    switchCities () {
      this.$emit('updateCity')
    },
    switchOpen () {
      this.open = !this.open
      this.$emit('switchOpen')
    },
    regetRegionData () {
      this.$emit('getRegionData')
    },
    transformBusinessWeek (week) {
      let items = []
      items = week.split('，')
      return items
    },
    switchType (type) {
      this.$emit('typeChange', type)
    },
    transformOpen (timeStart, timeEnd, dayArr) {
      let openTime = true
      let openDay = false
      const now = new Date()
      const nowDay = now.getDay()
      let strNowDay = ''
      switch (nowDay) {
        case 0:
          strNowDay = '星期日'
          break
        case 1:
          strNowDay = '星期一'
          break
        case 2:
          strNowDay = '星期二'
          break
        case 3:
          strNowDay = '星期三'
          break
        case 4:
          strNowDay = '星期四'
          break
        case 5:
          strNowDay = '星期五'
          break
        case 6:
          strNowDay = '星期六'
          break
      }
      if (dayArr.indexOf(strNowDay) !== -1) {
        openDay = true
      }
      const nowTime = moment(`${now.getHours()}:${now.getMinutes()}`, 'HH:mm')
      const strS = moment(timeStart, 'HH:mm')
      const strE = moment(timeEnd, 'HH:mm')
      const IsAfter = nowTime.isAfter(strS, 'second')
      const IsBefore = nowTime.isBefore(strE, 'second')
      if (strS.isSame(strE)) {
        openTime = true
      } else if (strE.isBefore(moment('12:00', 'HH:mm')) && (strE.isAfter(moment('00:00', 'HH:mm')) || strE.isSame(moment('00:00', 'HH:mm')))) {
        if (strS.isAfter(strE)) {
          openTime = IsAfter && (nowTime.isAfter(strE, 'second'))
        } else {
          openTime = IsAfter && IsBefore
        }
      } else {
        openTime = IsAfter && IsBefore
      }

      if (openTime && openDay) {
        return true
      } else {
        return false
      }
    },
    OpenPopup (event, id) {
      if (event.target.nodeName === 'BUTTON') return
      this.$emit('openMarkerPopup', id)
    }
  }
}
</script>
