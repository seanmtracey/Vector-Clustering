const debug = require('debug')('category-clusters');

// Based on https://github.com/garyshort/chickens
function doTheThing(data, options){ 

    const Clusters = [];

    const NeighbourThreshold = options.neighbourThreshold || 3;
    const NoiseThreshold = options.noiseThreshold || 2;

    function EuclideanDistanceBetween(p1, p2){
        const a = p1[0] - p2[0]
        const b = p1[1] - p2[1];

        return Math.sqrt( a * a + b * b );
    }

    function IsCloseTo(p1, p2){
        return EuclideanDistanceBetween(p1, p2) <= NeighbourThreshold;
    }

    function CalculateVoteOfPoint(p1, p2){
        return 1 / EuclideanDistanceBetween(p1, p2);
    }

    function CullNoiseClusters(Clusters, noiseThreshold = NoiseThreshold){
        return Clusters.filter(cluster => cluster.length > noiseThreshold);
    }

    function ClusterPoint(item){
        let chosenCluster = null;
        let votesCast = 0;

        // If this is the first point, it's the root of the first cluster
        if (Clusters.length == 0) {
            Clusters.push([item]);
        } else {
            // Otherwise iterate over all the clusters...
            Clusters.forEach(cluster => {
                // Find all the points within PointThreshold distance

                const votingPoints = cluster.filter(clusteredItem => {
                    return IsCloseTo( [clusteredItem.start, 0], [item.start, 0] );
                });

                // Sum the votes of the voting points
                const totalVotes = votingPoints.reduce( (totalSoFar, clusteredItem) => { return CalculateVoteOfPoint([clusteredItem.start, 0], [item.start, 0] ) }, 0);

                // If this is the current max then this is the selected cluster
                if (totalVotes > votesCast) {
                    chosenCluster = cluster;
                    votesCast = totalVotes;
                }
            });

            // After voting if there's a chosen cluster, add the point
            if (chosenCluster != null){
                chosenCluster.push( item );
            } else {
                // There's no close clusters, so start a new one
                debug('Point is too far from any cluster. Creating new cluster.');
                Clusters.push( [item] );
            }
        }
    }

    function ClusterAllPoints(items){

        items.forEach(item => ClusterPoint(item));

    }
    
    return new Promise( (resolve, reject) => {

        ClusterAllPoints(data);
        const CulledClusters = CullNoiseClusters(Clusters, NoiseThreshold).map(cluster => {

            const allTopics = {};

            const C = {};

            cluster.forEach(item => {
                if(!allTopics[item.topic]){
                    allTopics[item.topic] = item.topic.score;
                } else {
                    allTopics[item.topic] += item.topic.score;
                }
            });

            C.topics = Object.keys(allTopics).sort( (a, b) => {
                return allTopics[a] > allTopics[b];
            });

            C.start = cluster[0].start;
            C.end = cluster[ cluster.length - 1 ].end;

            return C;

        });
        
        debug(`${CulledClusters.length} clusters`);

        resolve({
            numberOfClusters : Clusters.length,
            clusters : CulledClusters
        });
    
    });

}

module.exports = function(data = [], options = {}){
   
    return doTheThing(data, options);

}