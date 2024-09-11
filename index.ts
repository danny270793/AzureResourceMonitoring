import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
import { Azure } from '@danny270793/azureservicesclient'
import {
    Resource,
    ResourceGroup,
} from '@danny270793/azureservicesclient/build/responses'
import Kubernetes from '@danny270793/azureservicesclient/build/responses/kubernetes'
import virtualMachineInstanceView, {
    virtualMachineInstanceViewStatus,
} from '@danny270793/azureservicesclient/build/responses/vm-instance-view'
import Telegram from './libraries/telegram'

async function main(): Promise<void> {
    const azureSubscriptionsNames: string[] = (
        process.env.AZURE_SUBSCRIPTIONS_NAMES || ''
    ).split(',')
    const azureSubscriptionsIds: string[] = (
        process.env.AZURE_SUBSCRIPTIONS_IDS || ''
    ).split(',')
    const azureTenantId: string = process.env.AZURE_TENANT_ID || ''
    const azureClientId: string = process.env.AZURE_CLIENT_ID || ''
    const azureClientSecret: string = process.env.AZURE_CLIENT_SECRET || ''

    const TELEGRAM_BOT_ID: string = process.env.TELEGRAM_BOT_ID || ''
    const TELEGRAM_RECEIVER_ID: string = process.env.TELEGRAM_RECEIVER_ID || ''
    const telegram: Telegram = new Telegram(TELEGRAM_BOT_ID)

    for (let index: number = 0; index < azureSubscriptionsIds.length; index++) {
        const azureSubscriptionId: string = azureSubscriptionsIds[index]
        console.log(
            `Gathering data from subscription ${azureSubscriptionId} called ${azureSubscriptionsNames[index]}`,
        )
        const azure: Azure = new Azure(
            azureSubscriptionId,
            azureTenantId,
            azureClientId,
            azureClientSecret,
        )

        const resourceGroups: ResourceGroup[] = await azure.getResourceGroups()
        for (const resourceGroup of resourceGroups) {
            console.log(`\tresouce group ${resourceGroup.name}`)
            const resouces: Resource[] = await azure.getResourceByResourceGroup(
                resourceGroup.name,
            )
            for (const resouce of resouces) {
                //'Microsoft.ContainerService/managedClusters', 'Microsoft.Fabric/capacities', 'Microsoft.MachineLearningServices/workspaces', 'Microsoft.Sql/servers/databases', 'Microsoft.Databricks/workspaces', 'Microsoft.Sql/servers', 'Microsoft.Synapse/workspaces/bigDataPools', 'Microsoft.Synapse/workspaces/sqlPools'
                if (`${resouce.type}` === 'Microsoft.Compute/virtualMachines') {
                    const virtualMachineInstanceView: virtualMachineInstanceView =
                        await azure.getVirtualMachineInstanceView(
                            resourceGroup.name,
                            resouce.name,
                        )
                    const instanceView: virtualMachineInstanceViewStatus =
                        virtualMachineInstanceView.statuses.filter(
                            (status: virtualMachineInstanceViewStatus) =>
                                status.code.startsWith('PowerState'),
                        )[0]
                    if (instanceView['code'] !== 'PowerState/deallocated') {
                        const message: string = `Virtual Machine not deallocated\n\nVirtual machine: ${resouce.name}\nResouce group: ${resourceGroup.name}\nSubscription Id: ${azureSubscriptionId}\nSubscription: ${azureSubscriptionsNames[index]}\n\n${JSON.stringify(instanceView, null, 4)}`
                        await telegram.sendMessage(
                            TELEGRAM_RECEIVER_ID,
                            message,
                        )
                    }
                } else if (
                    `${resouce.type}` ===
                    'Microsoft.ContainerService/managedClusters'
                ) {
                    const kubernetes: Kubernetes = await azure.getKubernetes(
                        resourceGroup.name,
                        resouce.name,
                    )
                    if (kubernetes.properties.powerState.code !== 'Stopped') {
                        const message: string = `Kubernetes not stopped\n\nKubernetes: ${kubernetes.name}\nResouce group: ${resourceGroup.name}\nSubscription Id: ${azureSubscriptionId}\nSubscription: ${azureSubscriptionsNames[index]}\n\n${JSON.stringify(kubernetes.properties.powerState, null, 4)}`
                        await telegram.sendMessage(
                            TELEGRAM_RECEIVER_ID,
                            message,
                        )
                    }
                } else {
                    //console.log(resouce)
                }
            }
        }
    }

    console.log('done')
}

export const handler = async (
    event: APIGatewayEvent,
    context: Context,
): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`)
    console.log(`Context: ${JSON.stringify(context, null, 2)}`)
    await main()
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'done',
        }),
    }
}
