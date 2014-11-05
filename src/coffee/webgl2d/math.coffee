math = 
	M_PI: 3.1415926535897932384626433832795028841968
	M_TWO_PI: 2.0 * M_PI
	M_HALF_PI: M_PI / 2.0

	isPOT: (value) ->
	  value > 0 and ((value - 1) & value) is 0
