/**
 * Monitoring System for FleetTools Coordination
 *
 * Provides real-time monitoring of agents, missions, and system health
 * Generates metrics and alerts for coordination system
 */
export class CoordinationMonitor {
    config;
    metrics = [];
    alerts = new Map();
    startTime = new Date();
    collectInterval;
    lastSystemMetrics = {
        memoryUsage: 0,
        cpuUsage: 0,
        responseTime: 0
    };
    constructor(config = {}) {
        this.config = {
            alertConfig: {
                agentFailureThreshold: 3, // failures in last hour
                missionStaleThreshold: 24, // hours
                conflictCriticalThreshold: 5, // critical conflicts
                responseTimeThreshold: 5000, // 5 seconds
                memoryUsageThreshold: 80, // 80%
                cpuUsageThreshold: 85 // 85%
            },
            metricsRetention: 7, // 7 days
            alertRetention: 30, // 30 days
            collectInterval: 30000, // 30 seconds
            ...config
        };
        console.log('✓ CoordinationMonitor initialized');
    }
    /**
     * Start monitoring collection
     */
    start() {
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
        }
        this.collectInterval = setInterval(() => {
            this.collectMetrics();
            this.checkAlerts();
        }, this.config.collectInterval);
        console.log('📊 Monitoring started');
    }
    /**
     * Stop monitoring collection
     */
    stop() {
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
            this.collectInterval = undefined;
        }
        console.log('📊 Monitoring stopped');
    }
    /**
     * Collect current system metrics
     */
    async collectMetrics() {
        const timestamp = new Date().toISOString();
        // In a real implementation, these would come from actual components
        // For now, we'll simulate the data collection
        const metrics = {
            timestamp,
            agents: await this.collectAgentMetrics(),
            missions: await this.collectMissionMetrics(),
            tasks: await this.collectTaskMetrics(),
            conflicts: await this.collectConflictMetrics(),
            system: await this.collectSystemMetrics()
        };
        // Store metrics
        this.metrics.push(metrics);
        // Keep only metrics within retention period
        this.cleanupOldMetrics();
        // Update system metrics for next collection
        this.lastSystemMetrics = {
            memoryUsage: metrics.system.memoryUsage,
            cpuUsage: metrics.system.cpuUsage,
            responseTime: metrics.system.responseTime
        };
        return metrics;
    }
    /**
     * Collect agent-related metrics
     */
    async collectAgentMetrics() {
        // In real implementation, this would query AgentSpawner
        // For now, return simulated data
        return {
            total: 10,
            running: 6,
            idle: 2,
            failed: 2,
            averageUptime: 1800 // 30 minutes
        };
    }
    /**
     * Collect mission-related metrics
     */
    async collectMissionMetrics() {
        // In real implementation, this would query ProgressTracker
        // For now, return simulated data
        return {
            total: 15,
            active: 5,
            completed: 8,
            averageProgress: 67.5
        };
    }
    /**
     * Collect task-related metrics
     */
    async collectTaskMetrics() {
        // In real implementation, this would query TaskQueue
        // For now, return simulated data
        return {
            total: 45,
            pending: 12,
            inProgress: 8,
            completed: 20,
            failed: 5
        };
    }
    /**
     * Collect conflict-related metrics
     */
    async collectConflictMetrics() {
        // In real implementation, this would query ConflictResolver
        // For now, return simulated data
        return {
            total: 8,
            unresolved: 2,
            autoResolved: 5,
            manuallyResolved: 1
        };
    }
    /**
     * Collect system-related metrics
     */
    async collectSystemMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        // Use Node.js process metrics for memory and CPU
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        // CPU usage (simplified - real implementation would use more accurate measurement)
        const cpuUsage = Math.random() * 20 + 10; // 10-30% simulated
        // Response time measurement (would be measured from actual API calls)
        const responseTime = this.lastSystemMetrics.responseTime * 0.9 + Math.random() * 100; // Smoothed response time
        return {
            uptime: uptime,
            memoryUsage: Math.round(memoryUsagePercent * 100) / 100,
            cpuUsage: Math.round(cpuUsage * 100) / 100,
            responseTime: Math.round(responseTime * 100) / 100
        };
    }
    /**
     * Check for alerts based on current metrics
     */
    async checkAlerts() {
        const latestMetrics = this.metrics[this.metrics.length - 1];
        if (!latestMetrics) {
            return [];
        }
        const newAlerts = [];
        const config = this.config.alertConfig;
        // Check agent failure rate
        const agentFailures = this.getRecentAgentFailures();
        if (agentFailures >= config.agentFailureThreshold) {
            newAlerts.push(this.createAlert('agent_failure', 'high', `High agent failure rate: ${agentFailures} failures in last hour`, { failureCount: agentFailures, threshold: config.agentFailureThreshold }));
        }
        // Check stale missions
        const staleMissions = this.getStaleMissions(config.missionStaleThreshold);
        if (staleMissions.length > 0) {
            newAlerts.push(this.createAlert('mission_stale', 'medium', `${staleMissions.length} missions stale for over ${config.missionStaleThreshold} hours`, { staleMissions, thresholdHours: config.missionStaleThreshold }));
        }
        // Check critical conflicts
        if (latestMetrics.conflicts.unresolved > 0) {
            const criticalConflicts = await this.getCriticalConflicts();
            if (criticalConflicts.length >= config.conflictCriticalThreshold) {
                newAlerts.push(this.createAlert('conflict_critical', 'critical', `High number of critical conflicts: ${criticalConflicts.length}`, { conflictCount: criticalConflicts.length, threshold: config.conflictCriticalThreshold }));
            }
        }
        // Check performance metrics
        if (latestMetrics.system.responseTime > config.responseTimeThreshold) {
            newAlerts.push(this.createAlert('performance', 'high', `High response time: ${latestMetrics.system.responseTime}ms (threshold: ${config.responseTimeThreshold}ms)`, { responseTime: latestMetrics.system.responseTime, threshold: config.responseTimeThreshold }));
        }
        if (latestMetrics.system.memoryUsage > config.memoryUsageThreshold) {
            newAlerts.push(this.createAlert('resource', 'high', `High memory usage: ${latestMetrics.system.memoryUsage}% (threshold: ${config.memoryUsageThreshold}%)`, { memoryUsage: latestMetrics.system.memoryUsage, threshold: config.memoryUsageThreshold }));
        }
        if (latestMetrics.system.cpuUsage > config.cpuUsageThreshold) {
            newAlerts.push(this.createAlert('resource', 'medium', `High CPU usage: ${latestMetrics.system.cpuUsage}% (threshold: ${config.cpuUsageThreshold}%)`, { cpuUsage: latestMetrics.system.cpuUsage, threshold: config.cpuUsageThreshold }));
        }
        // Store new alerts
        newAlerts.forEach(alert => {
            this.alerts.set(alert.id, alert);
        });
        if (newAlerts.length > 0) {
            console.log(`🚨 Generated ${newAlerts.length} alerts`);
            newAlerts.forEach(alert => {
                console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
        }
        return newAlerts;
    }
    /**
     * Create a new alert
     */
    createAlert(type, severity, message, metadata) {
        return {
            id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type,
            severity,
            message,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata
        };
    }
    /**
     * Get current monitoring dashboard data
     */
    async getDashboardData() {
        const metrics = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
        const alerts = Array.from(this.alerts.values());
        const unresolvedAlerts = alerts.filter(alert => !alert.resolved);
        const criticalAlerts = unresolvedAlerts.filter(alert => alert.severity === 'critical');
        // Determine system health
        let systemHealth = 'healthy';
        if (criticalAlerts.length > 0) {
            systemHealth = 'critical';
        }
        else if (unresolvedAlerts.length > 5) {
            systemHealth = 'warning';
        }
        return {
            metrics,
            alerts,
            summary: {
                totalAlerts: alerts.length,
                unresolvedAlerts: unresolvedAlerts.length,
                criticalAlerts: criticalAlerts.length,
                systemHealth
            }
        };
    }
    /**
     * Get metrics history
     */
    getMetricsHistory(hours = 24) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);
        return this.metrics.filter(metric => new Date(metric.timestamp) >= cutoff);
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    }
    /**
     * Resolve an alert
     */
    resolveAlert(alertId, resolution) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            if (resolution) {
                alert.metadata.resolution = resolution;
            }
            this.alerts.set(alertId, alert);
            console.log(`✓ Resolved alert ${alertId}: ${alert.message}`);
        }
    }
    /**
     * Helper methods for alert checking
     */
    getRecentAgentFailures() {
        // In real implementation, this would query agent failure logs
        // For now, return simulated data
        return Math.floor(Math.random() * 5);
    }
    getStaleMissions(hours) {
        // In real implementation, this would query mission data
        // For now, return simulated data
        return Math.random() > 0.7 ? ['mission-123', 'mission-456'] : [];
    }
    async getCriticalConflicts() {
        // In real implementation, this would query conflict resolver
        // For now, return simulated data
        return Math.random() > 0.8 ? ['conflict-1', 'conflict-2'] : [];
    }
    /**
     * Clean up old metrics beyond retention period
     */
    cleanupOldMetrics() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.config.metricsRetention);
        const beforeCount = this.metrics.length;
        this.metrics = this.metrics.filter(metric => new Date(metric.timestamp) >= cutoff);
        if (this.metrics.length < beforeCount) {
            console.log(`🧹 Cleaned up ${beforeCount - this.metrics.length} old metrics records`);
        }
    }
    /**
     * Clean up old resolved alerts
     */
    cleanupOldAlerts() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.config.alertRetention);
        let cleanedCount = 0;
        for (const [alertId, alert] of this.alerts.entries()) {
            if (alert.resolved && alert.resolvedAt && new Date(alert.resolvedAt) < cutoff) {
                this.alerts.delete(alertId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old resolved alerts`);
        }
    }
    /**
     * Export monitoring data for external systems
     */
    exportData() {
        const summaryMetrics = this.calculateSummaryMetrics();
        return {
            metrics: this.metrics,
            alerts: Array.from(this.alerts.values()),
            summary: summaryMetrics
        };
    }
    /**
     * Calculate summary metrics from all collected data
     */
    calculateSummaryMetrics() {
        if (this.metrics.length === 0) {
            throw new Error('No metrics available for summary calculation');
        }
        const latest = this.metrics[this.metrics.length - 1];
        // Calculate averages across all metrics
        const avgAgents = this.calculateAverage(this.metrics.map(m => m.agents.total));
        const avgMissions = this.calculateAverage(this.metrics.map(m => m.missions.total));
        const avgTasks = this.calculateAverage(this.metrics.map(m => m.tasks.total));
        return {
            timestamp: new Date().toISOString(),
            agents: {
                ...latest.agents,
                total: Math.round(avgAgents)
            },
            missions: {
                ...latest.missions,
                total: Math.round(avgMissions)
            },
            tasks: {
                ...latest.tasks,
                total: Math.round(avgTasks)
            },
            conflicts: latest.conflicts,
            system: latest.system
        };
    }
    calculateAverage(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    /**
     * Get system health status
     */
    getSystemHealth() {
        const latest = this.metrics[this.metrics.length - 1];
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
        const issues = [];
        const recommendations = [];
        if (!latest) {
            return {
                status: 'warning',
                issues: ['No metrics available'],
                recommendations: ['Start monitoring collection']
            };
        }
        // Check various health indicators
        if (criticalAlerts.length > 0) {
            issues.push(`${criticalAlerts.length} critical alerts active`);
            recommendations.push('Address critical alerts immediately');
        }
        if (latest.system.memoryUsage > this.config.alertConfig.memoryUsageThreshold) {
            issues.push(`High memory usage: ${latest.system.memoryUsage}%`);
            recommendations.push('Monitor memory leaks, consider scaling');
        }
        if (latest.system.cpuUsage > this.config.alertConfig.cpuUsageThreshold) {
            issues.push(`High CPU usage: ${latest.system.cpuUsage}%`);
            recommendations.push('Optimize performance, distribute load');
        }
        if (latest.system.responseTime > this.config.alertConfig.responseTimeThreshold) {
            issues.push(`Slow response times: ${latest.system.responseTime}ms`);
            recommendations.push('Optimize API performance');
        }
        const status = criticalAlerts.length > 0 ? 'critical' :
            issues.length > 0 ? 'warning' : 'healthy';
        return {
            status,
            issues,
            recommendations
        };
    }
}
//# sourceMappingURL=monitor.js.map