<template>
  <div class="home container-fluid px-0">
    <div class="loader-overlay justify-content-center align-items-center" :class="{'show': isLoading}">
      <div>
        <img src="@/assets/images/pig.png" alt="載入中" class="loader-img">
      </div>
    </div>
  <div class="row g-0">
      <div class="side">
        <Sidebar ref="sidebar" :open="isOpen" :countyList="countyList" :areaList="areaList" v-model:selectedCounty="county"
        v-model:selectedArea= "area" @update-city="switchCities" @switch-open="menuSwitch"
        @get-region-data="getPorkDataRegion" :pork-data="FilterResult" @type-change="SwitchType" @open-marker-popup="openCurrentPopup" />
        </div>
      <div class="main" :class="{'open':isOpen,'close':!isOpen}">
        <div id="map" class="map"></div>
        <div class="current-position"><button class="btn btn-light" @click.prevent="getCurrentPos"><i class="fas fa-crosshairs"></i></button></div>
        <div class="form-floating searchLocation">
          <input type="text" class="form-control" v-model.trim="seachShop" @keyup.enter="searchShop" placeholder="附近店家">
          <label for="floatingInput">搜尋附近店家</label>
          <button type="button" class="btn btn-inside" @click="searchShop"><i class="fas fa-search"></i></button>
        </div>
        <div class="alert alert-danger alert-dismissible fade alert-pos" :class="{'show' : hasError}" role="alert">
          發生錯誤!
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      </div>
    </div>
  <!-- Modal -->
  <div class="modal fade" id="modalDetail" tabindex="-1" aria-labelledby="modalDetailLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-main text-white">
          <h5 class="modal-title" id="modalDetailLabel"><strong>{{ currentMarker.market_name }}</strong></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body container">
          <ul class="list-group list-group-flush">
            <li class="list-group-item d-flex row">
            <div class="col-6">
              <span class="me-2">狀態:</span>
              <span v-if="currentMarker.business_week && currentMarker.business_hours && currentMarker.business_hurs_end"
               :class="{'text-success':transformOpen(currentMarker.business_hours, currentMarker.business_hurs_end, transformBusinessWeek(currentMarker.business_week))}">{{ transformOpen(currentMarker.business_hours, currentMarker.business_hurs_end, transformBusinessWeek(currentMarker.business_week))?'營業中':'尚未營業' }}</span>
            <span v-else>尚無資料</span>
            </div>
            <div class="col-6 d-flex align-items-center"><span class="me-2">類型:</span>
              <span class="badge rounded-pill bg-use" v-if="currentMarker.type === '餐飲'">餐飲</span>
              <span class="badge rounded-pill bg-warning" v-else-if="currentMarker.type === '販售'">販售</span>
              <span class="badge rounded-pill bg-secondary text-dark" v-else>其他</span>
            </div>
            </li>
            <li class="list-group-item d-flex row">
              <div class="col-12 col-sm-6 pb-2 mb-2 xs-underline">
                營業時間:<br>
                <ul>
                  <li v-for=" i in transformBusinessWeek(currentMarker.business_week)" :key="i">
                  {{ i }} {{ currentMarker.business_hours }}~{{ currentMarker.business_hurs_end }}
                  </li>
                </ul>
              </div>
              <div class="col-12 col-sm-6">
              <p><span class="me-2 nowrap">標章編號:</span>{{ currentMarker.badge_code }}</p>
              <p><span class="me-2 nowrap">有效日期:</span>{{ currentMarker.ValidDate }}</p>
              <p class="mb-0"><span class="me-2 nowrap">更新時間:</span>{{ currentMarker.last_edited_date }}</p>
              </div>
            </li>
            <li class="list-group-item"><span class="me-2">地址:</span> {{ currentMarker.addr }}</li>
            <li class="list-group-item"><span class="me-2">簡介:</span>{{ currentMarker.context }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue'
import region from '@/assets/json/city.json'
import L from 'leaflet'
import * as moment from 'moment'
import { Modal } from 'bootstrap'

export default {
  name: 'Home',
  components: {
    Sidebar
  },
  data () {
    return {
      isOpen: false,
      county: '新北市',
      area: '',
      countyList: [],
      areaList: [],
      region,
      porkDataList: [],
      porkDataRegion: [],
      type: '全部',
      FilterResult: [],
      porkMap: {},
      markerGroup: [],
      currentMarker: {},
      modalDetail: null,
      seachShop: '',
      isLoading: true,
      hasError: false,
      currentLat: '',
      currentLon: '',
      isLat: false,
      isSearch: false,
      isFirstTime: true
    }
  },
  methods: {
    menuSwitch () {
      this.isOpen = !this.isOpen
    },
    getRegion () {
      const vm = this
      vm.countyList = []
      vm.region.forEach((item) => {
        vm.countyList.push(item.name)
      })
    },
    switchCities () {
      const vm = this
      vm.areaList = []
      vm.region.forEach((item) => {
        if (item.name === vm.county) {
          vm.areaList = [...item.districts]
        }
      })
      vm.area = ''
    },
    mapInit () {
      this.porkMap = L.map('map').setView([24.97881, 121.54022], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.porkMap)
      this.porkMap.options.minZoom = 14
      this.porkMap.options.maxZoom = 18
    },
    updateMap (isLat, isSearch, type = '全部') {
      const vm = this
      const near = vm.porkDataList.filter((item) => {
        return vm.distance(vm.currentLat, vm.currentLon, item.Latitude, item.Lontitude, 'K') < 1.5
      })
      if (isLat && !isSearch) {
        switch (type) {
          case '全部':
            vm.FilterResult = [...near]
            break
          case '餐飲':
            vm.FilterResult = near.filter((item) => item.type === '餐飲')
            break
          case '販售':
            vm.FilterResult = near.filter((item) => item.type === '販售')
            break
          default:
            vm.FilterResult = near.filter((item) => item.type !== '販售' && item.type !== '餐飲')
            break
        }
      } else if (isSearch) {
        const vm = this
        const keyword = vm.seachShop
        const searchArr = []
        let tmpArray = []
        if (keyword !== '') {
          if (isLat) {
            tmpArray = [...near]
          } else {
            tmpArray = [...vm.porkDataRegion]
          }
          vm.FilterResult = []
          tmpArray.forEach((item) => {
            if (item.market_name.indexOf(keyword) !== -1) {
              searchArr.push(item)
            }
          })
          switch (type) {
            case '全部':
              vm.FilterResult = [...searchArr]
              break
            case '餐飲':
              vm.FilterResult = searchArr.filter((item) => item.type === '餐飲')
              break
            case '販售':
              vm.FilterResult = searchArr.filter((item) => item.type === '販售')
              break
            default:
              vm.FilterResult = searchArr.filter((item) => item.type !== '販售' && item.type !== '餐飲')
              break
          }
        } else {
          if (isLat) {
            vm.FilterResult = [...near]
          } else {
            vm.FilterResult = [...vm.porkDataRegion]
          }
        }
      } else {
        switch (type) {
          case '全部':
            if (!isLat) {
              vm.FilterResult = [...this.porkDataRegion]
            }
            break
          case '餐飲':
            vm.FilterResult = vm.porkDataRegion.filter((item) => item.type === '餐飲')
            break
          case '販售':
            vm.FilterResult = vm.porkDataRegion.filter((item) => item.type === '販售')
            break
          default:
            vm.FilterResult = vm.porkDataRegion.filter((item) => item.type !== '販售' && item.type !== '餐飲')
            break
        }
      }
      vm.markerGroup.forEach((item) => {
        vm.porkMap.removeLayer(item)
      })
      vm.markerGroup = []
      const latLngArr = []
      if (vm.FilterResult.length > 0) {
        vm.FilterResult.forEach((item) => {
          const weekArr = vm.transformBusinessWeek(item.business_week)
          const openTime = vm.transformOpen(item.business_hours, item.business_hurs_end, weekArr)
          const markerCache = L.marker([item.Latitude, item.Lontitude], { title: `${item.badge_code}` }).addTo(this.porkMap)
          markerCache.bindPopup(`<strong class="h5 mb-1">${item.market_name}</strong>
          <div class="d-flex justify-content-between mb-1"><p class="my-1">
          ${openTime ? '營業中' : openTime === undefined ? '尚無資料' : '尚未營業'}</p>
          <span class="badge rounded-pill bg-secondary text-dark my-1">${item.type === '餐飲' ? '餐飲' : item.type === '販售' ? '販售' : '其他'}</span>
          </div>
          <a class="btn btn-sm btn-warning p-1 text-dark me-2" href="https://www.google.com.tw/maps/place/${item.addr}" target="_blank"><small>前往店家</small></a>
          <button class="btn btn-sm btn-use p-1" id = "check${item.badge_code}"><small>查看詳情</small></button>`)
            .on('popupopen', function (popup) {
              const detailBtn = L.DomUtil.get(`check${item.badge_code}`)
              L.DomEvent.addListener(detailBtn, 'click', function (e) {
                vm.currentMarker = { ...item }
                vm.modalDetail.show()
              })
              vm.porkMap.setView(popup.target.getLatLng(), 16)
            })
          vm.markerGroup.push(markerCache)
          latLngArr.push([item.Latitude, item.Lontitude])
        })
        const bounds = new L.LatLngBounds(latLngArr)
        vm.porkMap.fitBounds(bounds)
      }
    },
    getPorkData () {
      const vm = this
      vm.isLat = false
      const api = 'https://script.google.com/macros/s/AKfycbzo4pQ-y9o3CpwHUHvnNNzL4ZtdQcWIC0hHJ1BaqwOf9DrLmkNWhzq2/exec?url=https://data.coa.gov.tw/Service/OpenData/TransService.aspx?UnitId=tR9TIFWlvquB'
      vm.axios.get(api).then((res) => {
        if (res.status === 200) {
          vm.porkDataList = res.data
          vm.getCurrentPos()
          vm.isFirstTime = false
          vm.isLoading = false
          vm.$refs.sidebar.switchOpen()
        } else {
          vm.hasError = true
        }
      }).catch(() => {
        vm.hasError = true
      })
    },
    getPorkDataRegion () {
      const vm = this
      vm.isLat = false
      vm.porkDataRegion = []
      vm.porkDataList.forEach((item) => {
        const county = item.addr.slice(0, 3)
        const city = item.addr.slice(3, 6)
        if (vm.county === county && vm.area === city) {
          vm.porkDataRegion.push(item)
        }
      })
      this.updateMap(vm.isLat, vm.isSearch)
    },
    SwitchType (type) {
      this.type = type
      this.updateMap(this.isLat, this.isSearch, this.type)
    },
    openCurrentPopup (id) {
      this.markerGroup.forEach((item) => {
        if (item.options.title === id) {
          item.openPopup()
        }
      })
    },
    transformOpen (timeStart, timeEnd, dayArr) {
      if (!dayArr || !timeStart || !timeEnd) return
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
    transformBusinessWeek (week) {
      if (week) {
        let items = []
        items = week.split('，')
        return items
      }
    },
    searchShop () {
      const vm = this
      vm.isSearch = true
      // update Map
      vm.updateMap(vm.isLat, vm.isSearch)
      vm.isSearch = false
    },
    getCurrentPos () {
      const vm = this
      if (navigator.geolocation) {
        if (vm.isFirstTime) {
          navigator.geolocation.getCurrentPosition(vm.showPosition, vm.ErrorHandle, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 })
        } else {
          navigator.geolocation.getCurrentPosition(vm.showPosition, vm.ErrorHandleAgain, { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 })
        }
      } else {
        this.area = '新店區'
        this.getPorkDataRegion()
      }
    },
    showPosition (position) {
      this.porkMap.setView([position.coords.latitude, position.coords.longitude], 16)
      this.currentLat = position.coords.latitude
      this.currentLon = position.coords.longitude
      const userPosIcon = L.icon({
        iconUrl: require('@/assets/images/userPosition.png'),
        iconSize: [30, 30],
        iconAnchor: [22, 94],
        popupAnchor: [-3, -76],
        shadowSize: [68, 95],
        shadowAnchor: [22, 94]
      })
      L.marker([this.currentLat, this.currentLon], { icon: userPosIcon }).addTo(this.porkMap)
      this.isLat = true
      this.area = ''
      this.seachShop = ''
      this.getNearShop()
    },
    ErrorHandle () {
      this.area = '新店區'
      this.getPorkDataRegion()
      alert('請允許瀏覽器使用定位服務搜尋附近商店，或依區域手動搜尋')
    },
    ErrorHandleAgain () {
      alert('請允許瀏覽器使用定位服務搜尋附近商店，或依區域手動搜尋')
    },
    getNearShop () {
      const vm = this
      vm.updateMap(vm.isLat, vm.isSearch)
    },
    distance (lat1, lon1, lat2, lon2, unit) { // 計算兩點之間距離
      if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0
      } else {
        const radlat1 = Math.PI * lat1 / 180
        const radlat2 = Math.PI * lat2 / 180
        const theta = lon1 - lon2
        const radtheta = Math.PI * theta / 180
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta)
        if (dist > 1) {
          dist = 1
        }
        dist = Math.acos(dist)
        dist = dist * 180 / Math.PI
        dist = dist * 60 * 1.1515
        if (unit === 'K') { dist = dist * 1.609344 }
        return dist
      }
    }
  },
  created () {
    this.getRegion()
    this.switchCities()
  },
  mounted () {
    this.mapInit()
    this.getPorkData()
    this.modalDetail = new Modal(document.getElementById('modalDetail'))
  }
}
</script>
