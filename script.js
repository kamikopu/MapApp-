'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------- DOM 元素 ----------------
const html = document.querySelector('html');

// 地图点击后显示的表单
const mapForm = document.querySelector('.form');
// 手动输入的表单
const manualForm = document.querySelector('.form-user-input');

// 地图表单中的输入元素
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// 手动输入表单中的输入元素
const inputType2 = document.querySelector('.form-user-input__input--type');
const inputDistance2 = document.querySelector(
  '.form-user-input__input--distance'
);
const inputDuration2 = document.querySelector(
  '.form-user-input__input--duration'
);
const inputCadence2 = document.querySelector(
  '.form-user-input__input--cadence'
);
const inputElevation2 = document.querySelector(
  '.form-user-input__input--elevation'
);
const formInputPost = document.querySelector('.form__input--post');

// 其它元素
const containerWorkouts = document.querySelector('.workouts');
const addNewData = document.querySelector('.add-new-data');

const formSort = document.querySelector('.form-sort');

// 数据模型
class Workout {
  date = new Date();
  id = new Date().getTime() + ''.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, gain) {
    super(coords, distance, duration);
    this.gain = gain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// ---------------- 应用主类 ----------------
let testData = false;

class App {
  //以下二个变量为长按相关的计时器
  intervalTimeLongPress;
  timeoutLongPress;
  //判断是否多次触发了长按按钮
  turnNumberBoolean = false;
  //判断是否从删除按钮开始按鼠标的
  startWithPressDelButton = false;
  #map;
  #mapEvent;
  #workouts;
  #localStorageGet;
  #elementAll;

  constructor() {
    this.#workouts = [];

    // 切换显示手动输入表单
    addNewData.addEventListener('click', () => {
      manualForm.classList.toggle('hidden');
      // 若手动输入表单显示，则隐藏地图表单
      if (!manualForm.classList.contains('hidden')) {
        mapForm.classList.add('hidden');
      }
    });

    //切换排序
    formSort.addEventListener('change', this._formSortFun.bind(this));

    // 点击地图时隐藏手动输入表单（避免两个表单同时出现）
    document.querySelector('#map').addEventListener('click', () => {
      if (!manualForm.classList.contains('hidden')) {
        manualForm.classList.add('hidden');
      }
    });

    // 当网页第一次加载时或唤起该函数时返回当前的全部运动表格的elment
    window.addEventListener('load', function (e) {
      if (document.querySelectorAll('.workout')) {
        this.elementAll = document.querySelectorAll('.workout');
        console.log(elementAll);
      }
    });

    // 获取用户当前位置
    this._getPosition();

    // 表单提交事件（两个表单均调用同一处理函数）
    mapForm.addEventListener('submit', this._newWorkout.bind(this));
    manualForm.addEventListener('submit', this._newWorkout.bind(this));

    // 切换运动类型时，切换步频与海拔输入项（仅针对地图表单）
    inputType.addEventListener('change', this._toggleElevationField);

    // 运动记录列表点击事件：移动地图到对应位置，同时处理删除
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // 全部删除功能结合比较困难 因此再添加单独处理长按删除的事件监视器
    window.addEventListener('mouseup', this._longPressMouseupFun.bind(this));
    window.addEventListener(
      'mousedown',
      this._longPressMousedoenFun.bind(this)
    );

    // 加载本地存储数据
    this._getLocalStorage();
    // 绑定本地存储对象到类实例
    this._bindWorkouts();

    console.log(this.#workouts);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // 点击地图时显示地图表单
    this.#map.on('click', this._showForm.bind(this));

    // 地图加载后，绘制已有数据的标记
    this._reMapPint();

    // 测试在地域上画线的参照代码
    // const testLatlngs = [
    //   [45.51, -122.68],
    //   [37.77, -122.43],
    //   [34.04, -118.2],
    // ];
    // const testPolyline = L.polyline(testLatlngs, { color: 'red' }).addTo(
    //   this.#map
    // );
    // // 将视图缩放到折线范围
    // this.#map.fitBounds(testPolyline.getBounds());
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    mapForm.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // 清空所有输入框
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence2.value =
      inputDistance2.value =
      inputDuration2.value =
      inputElevation2.value =
      formInputPost.value =
        '';

    // 隐藏两个表单
    mapForm.classList.add('hidden');
    manualForm.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // 辅助函数：检查输入是否为有效数字、是否为正数
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    let type, distance, duration, lat, lng;

    // 判断使用哪个表单
    if (manualForm.classList.contains('hidden')) {
      // 地图表单：使用地图点击处的坐标
      type = inputType.value;
      distance = +inputDistance.value;
      duration = +inputDuration.value;
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    } else {
      // 手动输入表单：从用户输入的经纬度获取坐标
      type = inputType2.value;
      distance = +inputDistance2.value;
      duration = +inputDuration2.value;
      const userInput = formInputPost.value.match(/^(.*)\,(.*)$/);
      if (!userInput) {
        return alert('Please enter valid coordinates separated by a comma');
      }
      lat = +userInput[1];
      lng = +userInput[2];
    }

    let workout;
    if (type === 'running') {
      const cadence = manualForm.classList.contains('hidden')
        ? +inputCadence.value
        : +inputCadence2.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = manualForm.classList.contains('hidden')
        ? +inputElevation.value
        : +inputElevation2.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // 添加到工作数据数组中
    this.#workouts.push(workout);

    // 在地图上渲染标记
    this._renderWorkoutMarker(workout);

    // 在列表中渲染记录
    this._renderWorkout(workout);

    // 隐藏表单并清空输入框
    this._hideForm();

    // 保存数据到本地存储
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    if (!this.#map) return console.log('Map is not initialized');

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.description} ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <button class="del">⛔</button>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.gain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    // 将新记录插入到地图表单之后（你也可以选择插入到 containerWorkouts 中）
    mapForm.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    });

    // 这里调用 click()（可选：用于统计点击次数）
    workout.click();

    // 处理删除功能
    this._del(e);
    console.log(e.target);
    console.log(e);
    //如果长按的话就全部删除的功能 好像在这个位置很难实现
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _bindWorkouts() {
    this.#workouts = this.#workouts.map(el => {
      if (el.type === 'running') return Object.assign(new Running(), el);
      if (el.type === 'cycling') return Object.assign(new Cycling(), el);
      return el;
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _del(e) {
    if (!e.target.classList.contains('del')) return;
    e.stopPropagation();

    const element = e.target.closest('.workout');
    const currentId = element.dataset.id;
    const index = this.#workouts.findIndex(data => data.id === currentId);
    if (index !== -1) this.#workouts.splice(index, 1);

    element.classList.add('hidden');
    setTimeout(() => element.remove(), 1000);
    //如果长按删除按钮的话就删除全部的记录条方法

    //更新储存 因该在函数最后
    this._setLocalStorage();
  }

  _reMapPint() {
    this.#workouts.forEach(work => {
      L.marker(work.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${work.type}-popup`,
          })
        )
        .setPopupContent(
          `${work.description} ${work.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}`
        )
        .openPopup();
    });
  }

  //长按下鼠标左键的处理
  _longPressMouseupFun(e) {
    //  window.addEventListener('mouseup', function (e) {

    if (e.target.classList.contains('del')) {
      e.stopPropagation();
      if (!this.startWithPressDelButton) return;
      console.log(2);
      if (this.timeoutLongPress) {
        clearTimeout(this.timeoutLongPress);
        this.timeoutLongPress = undefined;
      }
      if (this.intervalTimeLongPress) {
        clearInterval(this.intervalTimeLongPress);
        this.intervalTimeLongPress = undefined;
      }
      //在每次按键释放后都把判断变量重置
      this.startWithPressDelButton = false;
      this.turnNumberBoolean = false;
      console.log(this.startWithPressDelButton);
      console.log(this.turnNumberBoolean);
    }
    // });
  }

  //抬起左键的处理
  _longPressMousedoenFun(e) {
    // window.addEventListener('mousedown', function (e) {
    if (this.turnNumberBoolean) return;
    if (e.target.classList.contains('del') && !this.intervalTimeLongPress) {
      e.stopPropagation();

      this.startWithPressDelButton = true;
      // 因为没有用箭头函数或设置this指向所以定时器里的this指向全部错误了 // 已更正
      this.intervalTimeLongPress = setInterval(() => {
        console.log(1);
      }, 100);
      // 因为没有用箭头函数或设置this指向所以定时器里的this指向全部错误了 // 已更正
      this.timeoutLongPress = setTimeout(() => {
        // 获取所有的workout dom链接
        let workoutAll = document.querySelectorAll('.workout');

        //删除所有的workoutHTML元素
        workoutAll.forEach(el => {
          el.classList.add('hidden');
          setTimeout(() => {
            el.remove();
          }, 500);
        });

        //清除this.#workouts数组里的元素
        this.#workouts = [];
        //清除网页本地缓存
        this._setLocalStorage();

        // console.log(this.turnNumberBoolean);
        console.log('oky');
        this.turnNumberBoolean = true;
        clearInterval(this.intervalTimeLongPress);
        this.intervalTimeLongPress = undefined;
        this.timeoutLongPress = undefined;
      }, 2000);
    }
    // });
  }

  //表格排序的函数
  _formSortFun(e) {
    e.preventDefault();
    const kmFar = this.#workouts.sort((obja, objb) => {
      Number(obja.distance) < Number(objb.distance);
    });
    console.log(kmFar);
    
    if (e.target.value === 'naturalOrdering') {
      
    }
    if (e.target.value === 'farthestDistance') {
    
    }
  }
}

const app = new App();
