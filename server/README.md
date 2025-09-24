notation crows-foot
user [icon: user, color: blue, typeface: clean] {
id string pk
walletIds id[]
collaterals id[]
poolRecords id[]
borrowRecords id[]
}

wallet [icon: user, color: yellow] {
id string pk
address string
chain string
userId id pk
}

poolRecord {
id string pk
amount number
chain string
depositTxHash string
depositedBy id
amountLocked number
withdrawn number
endDate Date
}

collateralRecord {
id string pk
amount number
chain string
depositTxHash string
amountLocked number
depositedBy id
withdrawn number
}

repayRecord {
id string pk
amount number
chain string
associatedBorrow borrowRecordId
}

borrowRecord {
id string pk
amount number
chain string
borrowTxHash string
associatedCollaterals collateralId[]
associatedPools poolRecordId[]
associatedRepays repayRecordId[]
borrowedBy userId
}

borrowRecord.borrowedBy - user.id
user.borrowRecords < borrowRecord.id
repayRecord.associatedBorrow - borrowRecord.id
borrowRecord.associatedCollaterals < collateralRecord.id
borrowRecord.associatedPools < poolRecord.id
borrowRecord.associatedRepays < repayRecord.id
user.collaterals < collateralRecord.id
collateralRecord.depositedBy - user.id
poolRecord.depositedBy - user.id
user.poolRecords < poolRecord.id
user.walletIds < wallet.id
wallet.userId - user.id
