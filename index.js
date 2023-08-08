const fs = require('fs')
const yaml = require('js-yaml')
const fetch = require('node-fetch-npm')
const express = require('express')



const app = express()
app.use(express.json())
const port = 8081
app.listen(port, () => {
    console.log(`Rest API listening on port ${port}`)
})




async function GetTraefikConfig() {
    let Traefik_Coolify
    await fetch('http://0.0.0.0:3000/webhooks/traefik/main.json')
    .then(response => response.json())
    .then(data => {
        Traefik_Coolify = data
    })
    .catch(async (error) => {
        await fetch('http://localhost:3000/webhooks/traefik/main.json')
        .then(response => response.json())
        .then(data => {
            Traefik_Coolify = data
        })
    })

    let Traefik_EasyPanel = yaml.load(fs.readFileSync('/etc/easypanel/traefik/config/main.yaml', {encoding: 'utf-8'}))

    let Traefik_VPN = yaml.load(fs.readFileSync('/etc/traefik/traefik-vpn.yml', {encoding: 'utf-8'}))

    console.log(Traefik_Coolify)
    console.log(Traefik_EasyPanel)
    console.log(Traefik_VPN)



    let Traefik_Compiled = {
        http: {
            routers: {},
            services: {},
            middlewares: {}
        },
        tcp: {
            routers: {},
            services: {}
        }
    }



    console.log('-'.repeat(100))
    for (const router in Traefik_Coolify['http']['routers']) {
        let router_data = Traefik_Coolify['http']['routers'][router]

        indexWeb = router_data['entrypoints'].indexOf('web')
        if (indexWeb != -1) router_data['entrypoints'][indexWeb] = 'http'
        
        indexWebSecure = router_data['entrypoints'].indexOf('websecure')
        if (indexWebSecure != -1) router_data['entrypoints'][indexWebSecure] = 'https'

        if (router_data['rule'].includes('Host(`www.')) continue

        indexRedirectHttps = router_data['middlewares'].indexOf('redirect-to-https')
        if (indexRedirectHttps != -1) router_data['middlewares'].splice(indexRedirectHttps)

        Traefik_Compiled['http']['routers'][router] = router_data
        console.log(router, Traefik_Compiled['http']['routers'][router])
    }
    for (const router in Traefik_EasyPanel['http']['routers']) {
        let router_data = Traefik_EasyPanel['http']['routers'][router]

        if (router_data['service'] == 'error-pages') continue

        if (router_data['tls']) router_data['tls'] = { certresolver: 'letsencrypt' }

        if (router_data['rule'].includes('.easypanel.host`)')) continue

        if (router.includes('easypanel-ip')) continue

        indexRedirectHttps = router_data['middlewares'].indexOf('redirect-to-https')
        if (indexRedirectHttps != -1) router_data['middlewares'].splice(indexRedirectHttps)

        Traefik_Compiled['http']['routers'][router] = router_data
        console.log(router, Traefik_Compiled['http']['routers'][router])
    }
    for (const router in Traefik_VPN['tcp']['routers']) {
        let router_data = Traefik_VPN['tcp']['routers'][router]

        Traefik_Compiled['tcp']['routers'][router] = router_data
        console.log(router, Traefik_Compiled['tcp']['routers'][router])
    }
    console.log(Object.keys(Traefik_Compiled['http']['routers']).length)
    console.log(Object.keys(Traefik_Compiled['tcp']['routers']).length)



    console.log('-'.repeat(100))
    for (const service in Traefik_Coolify['http']['services']) {
        let service_data = Traefik_Coolify['http']['services'][service]

        Traefik_Compiled['http']['services'][service] = service_data
        console.log(service, Traefik_Compiled['http']['services'][service])
    }
    for (const service in Traefik_EasyPanel['http']['services']) {
        let service_data = Traefik_EasyPanel['http']['services'][service]

        if (service == 'error-pages') continue
        
        Traefik_Compiled['http']['services'][service] = service_data
        console.log(service, Traefik_Compiled['http']['services'][service])
    }
    for (const service in Traefik_VPN['tcp']['services']) {
        let service_data = Traefik_VPN['tcp']['services'][service]

        Traefik_Compiled['tcp']['services'][service] = service_data
        console.log(service, Traefik_Compiled['tcp']['services'][service])
    }
    console.log(Object.keys(Traefik_Compiled['http']['services']).length)
    console.log(Object.keys(Traefik_Compiled['tcp']['services']).length)



    console.log('-'.repeat(100))
    for (const middleware in Traefik_Coolify['http']['middlewares']) {
        let middleware_data = Traefik_Coolify['http']['middlewares'][middleware]

        if (middleware.includes('-www')) continue

        if (middleware == 'redirect-to-https') continue

        if (middleware == 'redirect-to-http') continue

        Traefik_Compiled['http']['middlewares'][middleware] = middleware_data
        console.log(middleware)
    }
    for (const middleware in Traefik_EasyPanel['http']['middlewares']) {
        let middleware_data = Traefik_EasyPanel['http']['middlewares'][middleware]
        
        if (middleware == 'error-pages') continue

        if (middleware == 'redirect-to-https') continue

        Traefik_Compiled['http']['middlewares'][middleware] = middleware_data
        console.log(middleware)
    }
    console.log(Object.keys(Traefik_Compiled['http']['middlewares']).length)
    if (Object.keys(Traefik_Compiled['http']['middlewares']).length == 0) delete Traefik_Compiled['http']['middlewares']

    console.log(Traefik_Compiled)
    return Traefik_Compiled
}
GetTraefikConfig()



app.get('/', async (req, res) => {
    console.log('-'.repeat(100))
    res.status(200).json(await GetTraefikConfig())
})