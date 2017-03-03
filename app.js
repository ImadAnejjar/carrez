//importing modules (-> librairies)
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );
var bodyParser=require('body-parser'); 

//creating a new express server -> express est un module pour le créer
var app = express();
var msg;

//setting EJS as the templating engine -> template
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
app.use( '/assets', express.static( 'assets' ) );


app.get( '/', function ( req, res ) {
	res.render('pages/index', { 
          error:'Url is empty'
          ,msg:""
          })
});

app.use(bodyParser.urlencoded({
	extended:true
}));


app.post('/scrape',function(req,res){
	 const url= req.body.lien;

    if(url!="")  //récupère url qu'on analyse
	{ 
	   getLBCData(url,res,getMAEstimation) //getMAE fn call back qui s'execute une fois que getLBCData est executée
    }
    else
    { //si url est pas rempli
    	console.log("erreur")
       res.render('pages/index', { 
          error:'Url is empty'
          ,msg:""
          }); //j'ai un répertoire page avec index.html
     }

    
});
   


function getLBCData(lbcUrl,routeResponse, callback)
{
	request( lbcUrl,function(error,response,html)
	{
		if(!error)
		{
			let $ =cheerio.load(html);//module pour parser le document html
            const lcbData=parseLBCData(html);

			if(lbcData) //si on extrait les données, callback est appelée
			 {
				console.log('LBCData:',lbcData)//affiche dans la console
				callback(lbcData,routeResponse)
			 }

			else
			 {
				routeResponse.render('pages/index',
					{error:'No data found',msg:""});
			 }
		}

		else
		{
			routeResponse.render('pages/index',
			{error:'Error loading the given URL',msg:""});
		}

		
	});
}



function parseLBCData(html)
{
	const $ =cheerio.load(html)

	const lbcDataArray=$('section.properties span.value')

	//toutes les valeurs des noeuds "span" qui sont fils de section.properties
	//stocke dans un tableau
	//récupérer les données à partir du tableau


	return lbcData={
		price: parseInt( $( lbcDataArray.get(0)).text().replace( /\s/g, ''),10),
		city : $( lbcDataArray.get(1)).text().trim().toLowerCase().replace( /\_|\s/g, '-').replace(/\-\d+/,''),
		postalCode : $( lbcDataArray.get(1)).text().trim().toLowerCase().replace(/\D|\-/g, ''),
		type : $( lbcDataArray.get(2)).text().trim().toLowerCase(),
		surface : parseInt( $( lbcDataArray.get(4)).text().replace(/\s/g,''),10)
	}
}


function parseMAData (html) {
	
	const priceAppartRegex = /\bappartement\b : (\d+) €/mi
	const priceHouseRegex = /\bmaison\b : (\d+) €/mi
	
	if(html)
	{
		const priceAppart = priceAppartRegex.exec( html ) && priceAppartRegex.exec( html ).length === 2 ? priceAppartRegex.exec( html )[1] :0
		const priceHouse = priceHouseRegex.exec( html ) && priceHouseRegex.exec( html ).length === 2 ? priceHouseRegex.exec( html )[1] :0
		if (priceAppart && priceHouse)
		{
			return maData = 
			{
				priceAppart,
				priceHouse
			}
		}
	}
	
}

function isGoodDeal(lbcData,maData)
{
	//prix de LBC
	const adPricePerSqM=Math.round(lbcData.price / lbcData.surface);
	var pourcentage= Math.sign((adPricePerSqM-maData)/maData) ;
	var affaire;

	//console.log(adPricePerSqM)
	//console.log(maData)

	if(maData>adPricePerSqM)
		{ affaire = "BONNE AFFAIRE!"}
	else
		{ affaire =	"MAUVAISE AFFAIRE"}

	return affaire;
}


function getMAEstimation(lbcData, routeResponse)
{
	if( lbcData.city && lbcData.postalCode && lbcData.surface && lbcData.price)
	{
		const url='https://www.meilleursagents.com/prix-immobilier/{city}-{postalCode}/'
		.replace('{city}',lbcData.city.replace(/\_/g,'-') )
		.replace( '{postalCode}', lbcData.postalCode);
		
		//console.log('MA URL: ',url)
		
		request( url, function(error,response, html)
		{
				
				if(!error)
				{
				 let $ = cheerio.load(html);

				 //console.log($('meta[name=description]').get());
				 //console.log($('meta[name=description]').get()[0].attribs);
				 //console.log($('meta[name=description]').get()[0].attribs.content);
			
					if ($ ('meta[name=description]').get().length === 1 && $( 'meta[name=description]').get()[0].attribs 
						  && $('meta[name=description]').get()[0].attribs.content)
				 
				 var maData=parseMAData(html)
				
				//on se réfère au prix du bien
					if(lbcData.type!=='appartement')
					{
						var ref = maData.priceHouse;
					}
					else
					{
						var ref = maData.priceAppart;
					}
			
					if(maData.priceAppart && maData.priceHouse)
					{
						
						msg = isGoodDeal(lbcData,ref);
						
						routeResponse.render('pages/index', 
						{
							msg:msg,
							data: {
									lbcData,
									maData,
										msg
								}					
						}

											)	


						

						console.log(msg)
					}




				}
				else{console.log("Erreur lors de l'estimation de MA")}
		}
		       )
	}
};


//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});


//mettre données dans fichier json
//afficher données sur le site
//comparaison
//afficher resultat