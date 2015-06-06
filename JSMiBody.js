(function () {
	'use strict'

	var jsMiBody = {};
	const NUM_USERS = 12
	const NUM_SLOTS_PER_USER = 35
	const NUM_BYTES_PER_SLOT = 18

	jsMiBody.jsMiBodyReading = function (rawData) {
		this.dateTime = dateTimeFromRawReading(rawData);

		var ageBits = byteToBooleanArray(rawData[7]);

		var genderBit = ageBits[7];

		if (genderBit) {
			this.gender = "male"
		}
		else {
			this.gender = "female"
		}

		ageBits[7] = false

		this.age = GetBitArrayValue(ageBits)

		this.height = rawData[8]

		var tmp1 = rawData[10]
        var tmp2 = rawData[11]
        var result = tmp1 << 8
        result += tmp2
        this.weight = result / 10

		tmp1 = rawData[12]
        tmp2 = rawData[13]
        result = tmp1 << 8
        result += tmp2
               
        this.bodyfat = result / 10

		tmp1 = rawData[15]
        tmp2 = rawData[16]
        result = tmp1 << 8
        result += tmp2
        this.muscleMass = result / 10

		this.visceralFat = rawData[17]

		this.BMR = CalculateBMR(this)

        // Step 13: Calc BMI
        this.BMI = CalculateBMI(this)

        this.bodywater = CalculateBodyWaterPerc(this)

		function dateTimeFromRawReading (rawData) {
			var year = rawData[0] << 8;
			year += rawData[1];

			var month = rawData[2];
			var day = rawData[3];

			var hour = rawData[4];
			var min = rawData[5];
			var sec = rawData[6];

			return new Date(year,month,day,hour,min,sec,0);
		}


		function byteToBooleanArray (input) {
			var output = new Array()

			for (var i = 0; i < 8; i++) {
				var curByte = 1;

				output.push(((curByte << i) & input) == 0 ? false : true)
			}

			return output;
		}

		function GetBitArrayValue(bArray) {
			var value = 0x00;

			for (var x = 0; x < bArray.length; x++) {
				value |= ((bArray[x] == true) ? (0x01 << x) : 0x00);
			}

			return value;
		}

		function CalculateBodyWaterPerc(bd) {
			var muscleMass = bd.muscleMass * bd.weight / 100

			var fatMass = bd.bodyfat * bd.weight / 100

			var restOfFluids = bd.weight - muscleMass - fatMass

			var waterMass = muscleMass * 0.83 + restOfFluids * 0.62

			var waterPerc = waterMass / bd.weight * 100

			// TODO Round to 1dp
			return waterPerc
			//return roundTo1dp(waterPerc);
		}

		function CalculateBMI(bd) {
			// convert height from cm to metres
			var heightInMetres = bd.height * 0.01;

			var tmp = heightInMetres * heightInMetres;

			var bmi = bd.weight / tmp;

			// TODO Round to 1dp
			return bmi;

			// 1.6 x 1.6 = 2.56. BMI would be 65 divided by 2.56 = 25.39.
			// calc taken from here:
			// http://www.bbc.co.uk/health/healthy_living/your_weight/bmiimperial_index.shtml
		}

		function CalculateBMR(bd) {
			// calc taken from here:
			// http://www.bmi-calculator.net/bmr-calculator/bmr-formula.php

			var BMR = 0;
			if (bd.gender == "female") {
				// Women: BMR = 655 + ( 9.6 x weight in kilos ) + ( 1.8 x height in
				// cm ) - ( 4.7 x age in years )
				BMR = 655 + (9.6 * bd.weight) + (1.8 * bd.height)
						- (4.7 * bd.age);
			} else {
				// Men: BMR = 66 + ( 13.7 x weight in kilos ) + ( 5 x height in cm )
				// - ( 6.8 x age in years )
				BMR = 66 + (13.7 * bd.weight) + (5 * bd.height)
						- (6.8 * bd.age);
			}

			return BMR;
		}
	

	}

	jsMiBody.jsMiBodyUser = function (rawData, userSlot) {
		this.userSlot = userSlot;
		this.readings = new Array();

		var rawCounter = 0;

		for (var slotCount = 0; slotCount < NUM_SLOTS_PER_USER; slotCount++)
		{
			var readingData = new Array();

			for (var i = 0; i < NUM_BYTES_PER_SLOT; i++) {
				readingData.push(rawData[rawCounter]);
				rawCounter++;
			}

			if (isRawReadingValid(readingData)) {
				var reading = new jsMiBody.jsMiBodyReading(readingData);
				this.readings.push(reading);
			}
		}

		function isRawReadingValid (rawData) {
			var nonZeroCount = 0;

			for (var i = 0; i < rawData.length; i++) {
				if (rawData[i] != 0) {
					nonZeroCount++;
				}
			}

			return nonZeroCount >= 5;
		}
	}

	jsMiBody.jsMiBodyFile = function (rawData) {
		var runningByteCount = 0;

		this.users = new Array();
		for (var user = 0; user < NUM_USERS; user++)
		{
			var temp = new Array();
			for (var bite = 0; bite < NUM_BYTES_PER_SLOT * NUM_SLOTS_PER_USER; bite++) 
			{
				temp.push(rawData[runningByteCount] & 0xFF);
				runningByteCount++;
			}
			var user = new jsMiBody.jsMiBodyUser(temp,user);
			if (user.readings.length > 0) {
				this.users.push(user);
			}
		}
	}
	window.jsMiBody = jsMiBody;
})();