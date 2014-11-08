math = 
  isPOT: (value) ->
    value > 0 and ((value - 1) & value) is 0

module.exports = math
