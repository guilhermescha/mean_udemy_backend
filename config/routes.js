const express = require('express')
const _ = require('lodash')

module.exports = function(server) {

    //API Routes
    const router = express.Router()
    server.use('/api', router)

    const billingCycle = require('../api/billingCycle/billingCycle')
    billingCycle.updateOptions({ new: true, runValidators: true })

    // Tratamento de erros para o caso de inserção/atualização de registros
    billingCycle.after('post', sendErrorsOrNext).after('put', sendErrorsOrNext)

    function sendErrorsOrNext(req, res, next) {
        const bundle = res.locals.bundle
        if (bundle.errors) {
            var errors = parseErrors(bundle.errors)
            res.status(500).json({ errors })
        } else {
            next()
        }
    }

    function parseErrors(nodeRestfulErrors) {
        const errors = []
        _.forIn(nodeRestfulErrors, error => errors.push(error.message))
        return errors
    }

    billingCycle.route('count', function(req, res, next) {
        billingCycle.count(function(error, value) {
            if (error) {
                res.status(500).json({ error: [error] })
            } else {
                res.json({ value })
            }
        })
    })

    billingCycle.register(router, '/billingCycles')

    /*const billingSummaryService = require('../api/billingSummary/billingSummaryService')
    router.route('/billingSummary').get(billingSummaryService.getSummary)*/

    // Mais uma função middleware
    function getSummary(req, res) {
        billingCycle.aggregate({
            $project: { credit: { $sum: "$credits.value" }, debt: { $sum: "$debts.value" } } // Somatório de todos os créditos e débitos
        }, {
            $group: { _id: null, credit: { $sum: "$credit" }, debt: { $sum: "$debt" } } // Agrupamento de todos os créditos e débitos
        }, {
            $project: { _id: 0, credit: 1, debt: 1 }
        }, function(error, result) {
            if (error) {
                res.status(500).json({ errors: [error] })
            } else {
                res.json(_.defaults(result[0], { credit: 0, debt: 0 }))
            }
        })
    }
    router.route('/billingSummary').get(getSummary)
}